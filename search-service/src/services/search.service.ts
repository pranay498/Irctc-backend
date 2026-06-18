import { esClient, STATION_INDEX, TRAIN_INDEX } from "../config/elasticsearch";
import logger from "../config/logger";

class SearchService {
  /**
   * When admin creates a station, index it for autocomplete.
   */
  async indexStation(event: any): Promise<void> {
    const station = event.data || event;
    if (!station) return;

    try {
      await esClient.index({
        index: STATION_INDEX,
        id: station.id,
        document: {
          stationId: station.id,
          name: station.name,
          code: station.code,
          city: station.city,
          suggest: {
            input: [station.name, station.code, station.city].filter(Boolean),
            weight: 10,
          },
        },
        refresh: true,
      });
      logger.info(`Indexed station ${station.name} (${station.code})`);
    } catch (err: any) {
      logger.error(`Failed to index station: ${err.message}`);
    }
  }

  /**
   * When admin creates a route, we get enriched payload with train+seats+routeStations.
   */
  async indexTrainRoute(routeEvent: any): Promise<void> {
    const data = routeEvent.data || routeEvent;
    const { train, routeStations } = data;
    if (!train || !routeStations) return;

    try {
      const seatSummary: Record<string, number> = { total: 0, LOWER: 0, MIDDLE: 0, UPPER: 0, SIDE_LOWER: 0, SIDE_UPPER: 0 };
      (train.seats || []).forEach((s: any) => {
        seatSummary.total++;
        if (seatSummary[s.seatType] !== undefined) {
          seatSummary[s.seatType]++;
        }
      });

      const doc = {
        trainId: train.id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        route: routeStations.map((rs: any) => ({
          stationId: rs.station.id,
          stationName: rs.station.name,
          stationCode: rs.station.code,
          sequenceNumber: rs.sequenceNumber,
          arrivalTime: rs.arrivalTime,
          departureTime: rs.departureTime,
          distanceFromOrigin: rs.distanceFromOrigin,
        })),
        schedules: [],
        seatSummary,
      };

      await esClient.index({
        index: TRAIN_INDEX,
        id: train.id,
        document:doc,
        refresh: true,
      });

      // Also index/update stations for autocomplete
      for (const rs of routeStations) {
        await esClient.index({
          index: STATION_INDEX,
          id: rs.station.id,
          document: {
            stationId: rs.station.id,
            name: rs.station.name,
            code: rs.station.code,
            city: rs.station.city,
            suggest: {
              input: [rs.station.name, rs.station.code, rs.station.city].filter(Boolean),
              weight: 10,
            },
          },
          refresh: true,
        });
      }

      logger.info(`Indexed train ${train.trainNumber} with ${routeStations.length} stations`);
    } catch (err: any) {
      logger.error(`Failed to index train route: ${err.message}`);
    }
  }

  /**
   * When admin creates a schedule, add it to the train's schedules array.
   */
  async indexSchedule(scheduleEvent: any): Promise<void> {
    const data = scheduleEvent.data || scheduleEvent;
    const { scheduleId, trainId, departureDate, status, seats } = data;

    const totalSeats = seats ? seats.length : 0;

    try {
      await esClient.update({
        index: TRAIN_INDEX,
        id: trainId,
        script: {
          source: `
            if (ctx._source.schedules == null) { ctx._source.schedules = []; }
            // Remove existing schedule with same id (idempotent)
            ctx._source.schedules.removeIf(s -> s.scheduleId == params.scheduleId);
            ctx._source.schedules.add(params.newSchedule);
          `,
          params: {
            scheduleId,
            newSchedule: {
              scheduleId,
              departureDate,
              status,
              available: totalSeats,
              locked: 0,
              booked: 0,
            },
          },
        },
        refresh: true,
      });
      logger.info(`Indexed schedule ${scheduleId} for train ${trainId}`);
    } catch (err: any) {
      logger.warn(`Could not index schedule for train ${trainId}: ${err.message}`);
    }
  }

  /**
   * When admin cancels a schedule, update its status in ES.
   */
  async cancelSchedule(event: any): Promise<void> {
    const schedule = event.data || event;
    if (!schedule) return;

    try {
      await esClient.update({
        index: TRAIN_INDEX,
        id: schedule.trainId,
        script: {
          source: `
            if (ctx._source.schedules != null) {
              for (def s : ctx._source.schedules) {
                if (s.scheduleId == params.scheduleId) {
                  s.status = 'CANCELLED';
                }
              }
            }
          `,
          params: { scheduleId: schedule.id },
        },
        refresh: true,
      });
      logger.info(`Cancelled schedule ${schedule.id} for train ${schedule.trainId}`);
    } catch (err: any) {
      logger.warn(`Could not cancel schedule: ${err.message}`);
    }
  }

  /**
   * When inventory changes (seat booked/released), update availability counts.
   */
  async updateSeatAvailability(event: any): Promise<void> {
    const data = event.data || event;
    const { scheduleId, trainId, available, locked, booked } = data;

    try {
      await esClient.update({
        index: TRAIN_INDEX,
        id: trainId,
        script: {
          source: `
            if (ctx._source.schedules != null) {
              for (def s : ctx._source.schedules) {
                if (s.scheduleId == params.scheduleId) {
                  s.available = params.available;
                  s.locked    = params.locked;
                  s.booked    = params.booked;
                }
              }
            }
          `,
          params: { scheduleId, available: available || 0, locked: locked || 0, booked: booked || 0 },
        },
        refresh: true,
      });
      logger.info(`Updated availability for schedule ${scheduleId}`);
    } catch (err: any) {
      logger.warn(`Could not update availability: ${err.message}`);
    }
  }

  /**
   * Search trains running between two stations on a given date.
   * Supports fuzzy matching on station names.
   */
  async searchTrains(from: string, to: string, date?: string): Promise<any> {
    const fromStation = await this.resolveStation(from);
    const toStation = await this.resolveStation(to);

    if (!fromStation) return { trains: [], message: `Station "${from}" not found` };
    if (!toStation) return { trains: [], message: `Station "${to}" not found` };

    const query = {
      bool: {
        must: [
          {
            nested: {
              path: 'route',
              query: { term: { 'route.stationId': fromStation.stationId } },
              inner_hits: { name: 'from_station' },
            },
          },
          {
            nested: {
              path: 'route',
              query: { term: { 'route.stationId': toStation.stationId } },
              inner_hits: { name: 'to_station' },
            },
          },
        ],
      },
    };

    const result = await esClient.search({
      index: TRAIN_INDEX,
      query:query,
      size: 50,
    });

    const normalize = (d: string) => new Date(d).toISOString().slice(0, 10);

    const trains = result.hits.hits
      .map((hit: any) => {
        const src = hit._source;
        const fromHit = hit.inner_hits.from_station.hits.hits[0]?._source;
        const toHit = hit.inner_hits.to_station.hits.hits[0]?._source;

        if (!fromHit || !toHit || fromHit.sequenceNumber >= toHit.sequenceNumber) {
          return null;
        }

        let scheduleInfo = null;
        if (date && src.schedules && src.schedules.length > 0) {
          scheduleInfo = src.schedules.find(
            (s: any) => s.status === 'ACTIVE' && normalize(s.departureDate) === date
          ) || null;
        }

        return {
          trainId: src.trainId,
          trainNumber: src.trainNumber,
          trainName: src.trainName,
          from: { 
            name: fromHit.stationName, 
            code: fromHit.stationCode, 
            departure: fromHit.departureTime, 
            stationId: fromHit.stationId, 
            sequenceNumber: fromHit.sequenceNumber 
          },
          to: { 
            name: toHit.stationName, 
            code: toHit.stationCode, 
            arrival: toHit.arrivalTime, 
            stationId: toHit.stationId, 
            sequenceNumber: toHit.sequenceNumber 
          },
          seatSummary: src.seatSummary,
          schedule: scheduleInfo,
        };
      })
      .filter(Boolean);

    return {
      from: { resolved: fromStation.name, code: fromStation.code },
      to: { resolved: toStation.name, code: toStation.code },
      date: date || 'any',
      count: trains.length,
      trains,
    };
  }

  /**
   * Fuzzy-resolve a station name/code to its ID.
   * Three strategies: exact code → completion suggester → fuzzy match
   */
  async resolveStation(input: string): Promise<any> {
    // 1. Try exact code match
    const exactResult = await esClient.search({
      index: STATION_INDEX,
      query: { term: { code: input.toUpperCase() } },
      size: 1,
    });
    if (exactResult.hits.hits.length > 0) {
      return exactResult.hits.hits[0]._source;
    }

    // 2. Try completion suggester
    try {
      const suggestResult = await esClient.search({
        index: STATION_INDEX,
        suggest: {
          station_suggest: {
            prefix: input,
            completion: {
              field: 'suggest',
              fuzzy: { fuzziness: 'AUTO' },
              size: 1,
            },
          },
        },
      });
      const options = (suggestResult.suggest?.station_suggest as any)?.[0]?.options || [];
      if (options.length > 0) return options[0]._source;
    } catch (err: any) {
      logger.warn(`Suggest fallback failed: ${err.message}`);
    }

    // 3. Fuzzy match on name
    const fuzzyResult = await esClient.search({
      index: STATION_INDEX,
      query: {
        multi_match: {
          query: input,
          fields: ['name', 'city'],
          fuzziness: 'AUTO',
          prefix_length: 1,
        },
      },
      size: 1,
    });

    return fuzzyResult.hits.hits.length > 0 ? fuzzyResult.hits.hits[0]._source : null;
  }

  /**
   * Autocomplete station names as user types.
   */
  async autocompleteStation(prefix: string): Promise<any> {
    const result = await esClient.search({
      index: STATION_INDEX,
      suggest: {
        station_suggest: {
          prefix,
          completion: {
            field: 'suggest',
            fuzzy: { fuzziness: 'AUTO' },
            size: 10,
          },
        },
      },
    });

    const options = (result.suggest?.station_suggest as any)?.[0]?.options || [];
    return options.map((o: any) => ({
      name: o._source.name,
      code: o._source.code,
      stationId: o._source.stationId,
    }));
  }

  /**
   * Debug: get all indexed stations
   */
  async getAllStations(): Promise<any> {
    const result = await esClient.search({
      index: STATION_INDEX,
      query: { match_all: {} },
      size: 100,
    });
    return result.hits.hits.map((h: any) => h._source);
  }

  /**
   * Debug: get all indexed trains
   */
  async getAllTrains(): Promise<any> {
    const result = await esClient.search({
      index: TRAIN_INDEX,
      query: { match_all: {} },
      size: 100,
    });
    return result.hits.hits.map((h: any) => h._source);
  }
}

export const searchService = new SearchService();
