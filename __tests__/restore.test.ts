import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, RefKey } from "../src/constants";
import run from "../src/restore";
import * as actionUtils from "../src/utils/actionUtils";
import * as testUtils from "../src/utils/testUtils";
import * as trivyDBUtils from "../src/utils/trivyDBUtils";

jest.mock("../src/utils/actionUtils");

beforeAll(() => {
    process.env["RUNNER_OS"] = "Linux";

    jest.spyOn(actionUtils, "isExactKeyMatch").mockImplementation(
        (key, cacheResult) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.isExactKeyMatch(key, cacheResult);
        }
    );

    jest.spyOn(actionUtils, "isValidEvent").mockImplementation(() => {
        const actualUtils = jest.requireActual("../src/utils/actionUtils");
        return actualUtils.isValidEvent();
    });

    jest.spyOn(actionUtils, "getInputAsArray").mockImplementation(
        (name, options) => {
            const actualUtils = jest.requireActual("../src/utils/actionUtils");
            return actualUtils.getInputAsArray(name, options);
        }
    );

    jest.spyOn(trivyDBUtils, "getLatestSHA256").mockImplementation(() => {
        return Promise.resolve("sha1234");
    });
});

beforeEach(() => {
    process.env[Events.Key] = Events.Push;
    process.env[RefKey] = "refs/heads/feature-branch";

    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => false);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => true
    );
});

afterEach(() => {
    testUtils.clearInputs();
    delete process.env[Events.Key];
    delete process.env[RefKey];
});

test("restore with invalid event outputs warning", async () => {
    const logWarningMock = jest.spyOn(actionUtils, "logWarning");
    const failedMock = jest.spyOn(core, "setFailed");
    const invalidEvent = "commit_comment";
    process.env[Events.Key] = invalidEvent;
    delete process.env[RefKey];
    await run();
    expect(logWarningMock).toHaveBeenCalledWith(
        `Event Validation Error: The event type ${invalidEvent} is not supported because it's not tied to a branch or tag ref.`
    );
    expect(failedMock).toHaveBeenCalledTimes(0);
});

test("restore without AC available should no-op", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => false);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => false
    );

    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    const setCacheHitOutputMock = jest.spyOn(actionUtils, "setCacheHitOutput");

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(0);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith(false);
});

test("restore on GHES without AC available should no-op", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => true);
    jest.spyOn(actionUtils, "isCacheFeatureAvailable").mockImplementation(
        () => false
    );

    const restoreCacheMock = jest.spyOn(cache, "restoreCache");
    const setCacheHitOutputMock = jest.spyOn(actionUtils, "setCacheHitOutput");

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(0);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith(false);
});

test("restore on GHES with AC available ", async () => {
    jest.spyOn(actionUtils, "isGhes").mockImplementation(() => true);
    const path = ".trivy";
    const key = "trivy-db-sha1234";

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(actionUtils, "setCacheHitOutput");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementationOnce(() => {
            return Promise.resolve(key);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(1);
    expect(restoreCacheMock).toHaveBeenCalledWith([path], key, []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", key);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith(true);

    expect(infoMock).toHaveBeenCalledWith(`Cache restored from key: ${key}`);
    expect(failedMock).toHaveBeenCalledTimes(0);
});

test("restore with no cache found", async () => {
    const path = ".trivy";
    const key = "trivy-db-sha1234";

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementationOnce(() => {
            return Promise.resolve(undefined);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(1);
    expect(restoreCacheMock).toHaveBeenCalledWith([path], key, []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", key);
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${key}`
    );
});

test("restore with restore keys and no cache found", async () => {
    const path = ".trivy";
    const key = "trivy-db-sha1234";

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementationOnce(() => {
            return Promise.resolve(undefined);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(1);
    expect(restoreCacheMock).toHaveBeenCalledWith([path], key, []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", key);
    expect(failedMock).toHaveBeenCalledTimes(0);

    expect(infoMock).toHaveBeenCalledWith(
        `Cache not found for input keys: ${key}`
    );
});

test("restore with cache found for key", async () => {
    const path = ".trivy";
    const key = "trivy-db-sha1234";

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(actionUtils, "setCacheHitOutput");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementationOnce(() => {
            return Promise.resolve(key);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(1);
    expect(restoreCacheMock).toHaveBeenCalledWith([path], key, []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", key);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith(true);

    expect(infoMock).toHaveBeenCalledWith(`Cache restored from key: ${key}`);
    expect(failedMock).toHaveBeenCalledTimes(0);
});

test("restore with cache found for key and prefix", async () => {
    const path = ".trivy";
    const prefix = "macos";
    const key = "trivy-db-sha1234";
    const cacheKey = prefix + "-" + key;
    testUtils.setInputs({ prefix, ghToken: "abc" });

    const infoMock = jest.spyOn(core, "info");
    const failedMock = jest.spyOn(core, "setFailed");
    const stateMock = jest.spyOn(core, "saveState");
    const setCacheHitOutputMock = jest.spyOn(actionUtils, "setCacheHitOutput");
    const restoreCacheMock = jest
        .spyOn(cache, "restoreCache")
        .mockImplementationOnce(() => {
            return Promise.resolve(cacheKey);
        });

    await run();

    expect(restoreCacheMock).toHaveBeenCalledTimes(1);
    expect(restoreCacheMock).toHaveBeenCalledWith([path], cacheKey, []);

    expect(stateMock).toHaveBeenCalledWith("CACHE_KEY", cacheKey);
    expect(setCacheHitOutputMock).toHaveBeenCalledTimes(1);
    expect(setCacheHitOutputMock).toHaveBeenCalledWith(true);

    expect(infoMock).toHaveBeenCalledWith(
        `Cache restored from key: ${cacheKey}`
    );
    expect(failedMock).toHaveBeenCalledTimes(0);
});

test("fails the step if error is thrown", async () => {
    const prefix = "macos";
    testUtils.setInputs({ prefix, ghToken: "abc" });
    const failedMock = jest.spyOn(core, "setFailed");
    jest.spyOn(trivyDBUtils, "getLatestSHA256").mockImplementation(() => {
        throw new Error("some error fetching sha");
    });
    await run();
    expect(failedMock).toHaveBeenCalledTimes(1);
});
