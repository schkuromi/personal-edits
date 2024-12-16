import { DependencyContainer } from "tsyringe";

import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { ISeasonalEventConfig } from "@spt/models/spt/config/ISeasonalEventConfig";

class Mod implements IPostSptLoadMod
{
    public postSptLoad(container: DependencyContainer): void
    {
        // get logger
        const logger = container.resolve<ILogger>("WinstonLogger");

        // get the config server so we can get a config with it
        const configServer = container.resolve<ConfigServer>("ConfigServer");

        // Request seasonal event config
        const seasonConfig: ISeasonalEventConfig = configServer.getConfig<ISeasonalEventConfig>(ConfigTypes.SEASONAL_EVENT);

        // Disable the seasonal event detection
        seasonConfig.enableSeasonalEventDetection = false;

        // Log the new seasonal event setting
        logger.info(`Seasonal event detection is now off.`);
    }
}

export const mod = new Mod();
