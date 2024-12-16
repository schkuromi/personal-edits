import { DependencyContainer } from "tsyringe";

import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { IInRaidConfig } from "@spt/models/spt/config/IInRaidConfig";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";

class Mod implements IPostDBLoadMod, IPostSptLoadMod
{    
    public postDBLoad(container: DependencyContainer): void
    {
        // get database from the server
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");

        // get all the in-memory json found in /assets/database
        const tables: IDatabaseTables = databaseServer.getTables();

        // change "Uncheck on Shot" to false
        tables.globals.config.UncheckOnShot = false;
        
        // change distance required for a kill to count as long shot to 50 meters (why? idk i saw that option and wanted to change it for fun)
        tables.globals.config.exp.kill.longShotDistance = 50;

        // change flea market to open at level 5
        tables.globals.config.RagFair.minUserLevel = 5;

        // remove labs keycard requirement
        tables.locations.laboratory.base.AccessKeys = [];

        // set all hideout areas construction times to as fast as possible (setting to 0 causes issues, until game client restarts)
        for (const i in tables.hideout.areas)
        {
            for (const i2 in tables.hideout.areas[i].stages)
            {
                tables.hideout.areas[i].stages[i2].constructionTime = 0.001
            }
        }

        // prepare item helper
        const itemHelper: ItemHelper = container.resolve<ItemHelper>("ItemHelper");
        const items = Object.values(tables.templates.items);

        // Changes affecting all items goes here
        const invItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.ITEM));

        for (const item of invItems)
        {
            // Set all items examined
            if (item._props.ExaminedByDefault == false)
            {
                item._props.ExaminedByDefault = true;
            }

            // Set all items raid moddable
            if (item._props.RaidModdable == false)
            {
                item._props.RaidModdable = true;
            }
        }

        // Disable insurance for all items with discard limit, then
        // Set all items to have no raid discard limit
        // code referenced from Looting Bots server mod
        for (const item of invItems)
        {
            if (item._props.DiscardLimit >= 0 && !item._props.IsAlwaysAvailableForInsurance)
            {
                item._props.InsuranceDisabled = true;
            }
        }
        tables.globals.config.DiscardLimitsEnabled = false;

        // removes item filters from THICC item case
        const containerThiccItem = tables.templates.items["5c0a840b86f7742ffa4f2482"]
        for (const i in containerThiccItem._props.Grids)
        {
            containerThiccItem._props.Grids[i]._props.filters = [];
        }
        // removes item filters from normal Item case
        const containerItemCase = tables.templates.items["59fb042886f7746c5005a7b2"]
        for (const i in containerItemCase._props.Grids)
        {
            containerItemCase._props.Grids[i]._props.filters = [];
        }
        // removes item fitlers from SICC pouch
        const containerSiccCase = tables.templates.items["5d235bb686f77443f4331278"]
        for (const i in containerSiccCase._props.Grids)
        {
            containerSiccCase._props.Grids[i]._props.filters = [];
        }

        // Allow Armor Rigs with Armor Vests
        const vests = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.VEST));

        for (const vest of vests)
        {
            if (vest._props.BlocksArmorVest == true)
            {
                vest._props.BlocksArmorVest = false;
            }
        }

        // Set all keys and keycards to have 0 weight
        // Set all keys to have 0 max usage
        const keyItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.KEY));

        for (const key of keyItems)
        {
            if (key._props.Weight)
            {
                key._props.Weight = 0;
            }
            if (key._props.MaximumNumberOfUsage)
            {
                key._props.MaximumNumberOfUsage = 0;
            }
        }

        // Set all ammo to have 0 weight
        const ammoItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.AMMO));

        for (const ammo of ammoItems)
        {
            if (ammo._props.Weight)
            {
                ammo._props.Weight = 0;
            }
        }

        // Set all food and drink items to have 0 weight
        const foodItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.FOOD_DRINK));

        for (const food of foodItems)
        {
            if (food._props.Weight)
            {
                food._props.Weight = 0;
            }
        }

        // Set all medical items to have 0 weight
        const medItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.MEDS));

        for (const med of medItems)
        {
            if (med._props.Weight)
            {
                med._props.Weight = 0;
            }
        }

        // Remove all item filters from secure containers
        const secureContainers = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.MOB_CONTAINER));

        for (const sec of secureContainers)
        {
            for (const i in sec._props.Grids)
            {
                if (sec._props.Grids[i]._props.filters)
                {
                    sec._props.Grids[i]._props.filters = [];
                }
            }
        }

        // Multiplies the stack size of all money items by 10
        const moneyItems = items.filter(x =>itemHelper.isOfBaseclass(x._id, BaseClasses.MONEY));

        for (const cash of moneyItems)
        {
            const cashStacks = cash._props.StackMaxSize * 10
            if (cash._props.StackMaxSize)
            {
                cash._props.StackMaxSize = cashStacks;
            }
        }
    }

    public postSptLoad(container: DependencyContainer): void
    {
        // get logger
        const logger = container.resolve<ILogger>("WinstonLogger");

        // get the config server so we can get a config with it
        const configServer = container.resolve<ConfigServer>("ConfigServer");

        // grab inraid.json config 
        const inraidConfig: IInRaidConfig = configServer.getConfig<IInRaidConfig>(ConfigTypes.IN_RAID)

        // disable MIA on raid end (seems like they renamed it to this in 3.10)
        inraidConfig.alwaysKeepFoundInRaidonRaidEnd = true;

        // make secure container items retain FIR status on death
        inraidConfig.keepFiRSecureContainerOnDeath = true;

        // Mod loaded message
        logger.logWithColor("[SCHKRM] Kuromi's Personal Edits is now loaded.", LogTextColor.BLACK, LogBackgroundColor.YELLOW);
    }
}

export const mod = new Mod();

