export const TOPICS = {
  STATION_CREATED: "station-created",
  TRAIN_CREATED: "train-created",
  SCHEDULE_CREATED: "schedule-created",
  SCHEDULE_CANCELLED: "schedule-cancelled",
  ROUTE_CREATED: "route-created",
  SEAT_AVAILABILITY_UPDATED: "seat-availability-updated",
  DLQ_BOOKING: "dlq-booking",
} as const;

export const DLQ_MAX_RETRIES = 3;

