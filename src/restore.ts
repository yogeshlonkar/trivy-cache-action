import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";
import { getLatestSHA256 } from "./utils/trivyDBUtils";

async function run(): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            utils.setCacheHitOutput(false);
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        let prefix = core.getInput(Inputs.Prefix);
        if (prefix !== "") {
            prefix += "-";
        }
        const ghToken = core.getInput(Inputs.GhToken);
        const sha = await getLatestSHA256(ghToken);
        const primaryKey = `${prefix}trivy-db-${sha}`;
        core.saveState(State.CachePrimaryKey, primaryKey);

        const restoreKeys = [];
        const cachePaths = [".trivy"];

        const cacheKey = await cache.restoreCache(
            cachePaths,
            primaryKey,
            restoreKeys
        );

        if (!cacheKey) {
            core.info(
                `Cache not found for input keys: ${[
                    primaryKey,
                    ...restoreKeys
                ].join(", ")}`
            );

            return;
        }

        // Store the matched cache key
        utils.setCacheState(cacheKey);

        const isExactKeyMatch = utils.isExactKeyMatch(primaryKey, cacheKey);
        utils.setCacheHitOutput(isExactKeyMatch);
        core.info(`Cache restored from key: ${cacheKey}`);
    } catch (error: unknown) {
        core.setFailed((error as Error).message);
    }
}

run();

export default run;
