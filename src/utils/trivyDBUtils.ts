import * as core from "@actions/core";
import { Headers, HttpClient } from "@actions/http-client";
import { exec as execP } from "child_process";
import util from "util";

export interface Versions {
    id: number;
    name: string;
    url: string;
    package_html_url: string;
    created_at: string;
    updated_at: string;
    html_url: string;
    metadata: {
        package_type: string;
        container: {
            tags: Array<string>;
        };
    };
}

export async function getLatestSHA256(ghToken: string): Promise<string> {
    core.startGroup("Fetch trivy DB SHA");
    const additionalHeaders = {
        [Headers.Accept]: "application/vnd.github+json",
        Authorization: `token ${ghToken}`
    };
    // const proxy = process.env["https_proxy"] || process.env["HTTPS_PROXY"];
    const _http = new HttpClient(process.env.GITHUB_ACTION_REPOSITORY);
    const { statusCode: status, result: versions } = await _http.getJson<
        Array<Versions>
    >(
        "https://api.github.com/orgs/aquasecurity/packages/container/trivy-db/versions",
        additionalHeaders
    );
    if (status !== 200) {
        throw new Error(`unexpected status from api.github.com: ${status}`);
    }
    core.info(`found ${versions?.length ?? 0} db versions`);
    const sha = versions
        ?.find(version => version.metadata.container.tags.includes("latest"))
        ?.name.replaceAll("sha256:", "");
    if (!sha) {
        throw new Error(`could not find latest trivy db sha`);
    }
    core.info(`latest sha ${sha}`);
    core.endGroup();
    return sha;
}

export async function fixPermissions(): Promise<void> {
    const exec = util.promisify(execP);
    let cmd = "chown -R $(stat . -c %u:%g) .trivy";
    try {
        await exec(`sh -c "type sudo 2>&1 >/dev/null"`);
        cmd = "sudo " + cmd;
    } catch (error: unknown) {
        core.info(`sudo not found probably running in container`);
    }
    core.info(`running ${cmd}`);
    await exec(cmd);
}
