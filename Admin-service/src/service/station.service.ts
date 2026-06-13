import { error } from "node:console";
import logger from "../config/logger";
import { prisma } from "../config/prisma"
import { adminProducer } from "../kafka/producer/admin.producer";

const createStation = async (data: { name: string; code: string; city: string; state: string }) => {
    try {
        const existingStation = await prisma.station.findUnique({
            where: {
                code: data.code,
            },
        });

        if (existingStation) {
            return null; // Or throw an error if needed
        }

        const station = await prisma.station.create({
            data: {
                name: data.name,
                city: data.city,
                code: data.code,
                state: data.state,
            },
        });

        logger.info('Station Created ',{station})

        await adminProducer.publishStationCreated(station).catch((error)=>{
            logger.error('Error publishing station created event:',error);
            throw error;
        });

        return station;

    } catch (error) {
        console.error("Error creating station:", error);
        throw error; 
    }
};

export { createStation };