import * as core from "@actions/core";
import { Headers, HttpClient } from "@actions/http-client";
import { exec as execP } from "child_process";
import util from "util";

// The DB is read from the registry rather than the GitHub Packages API: the
// aquasecurity org restricts that API with an IP allow list (#136), while
// ghcr.io serves the image to anyone with an anonymous pull token. The
// manifest digest is the same value the Packages API listed as the version
// name, so cache keys are unchanged. public.ecr.aws is not a fallback: it
// re-pushes the image and reports a different digest for the same tag.
const registry = "https://ghcr.io";
const repository = "aquasecurity/trivy-db";
const tag = "latest";
const manifestTypes = [
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json"
].join(", ");

interface TokenResponse {
    token?: string;
}

export async function getLatestSHA256(): Promise<string> {
    core.startGroup("Fetch trivy DB SHA");
    const _http = new HttpClient(process.env.GITHUB_ACTION_REPOSITORY);

    const { statusCode: tokenStatus, result } =
        await _http.getJson<TokenResponse>(
            `${registry}/token?scope=repository:${repository}:pull`
        );
    if (tokenStatus !== 200 || !result?.token) {
        throw new Error(`unexpected status from ghcr.io token: ${tokenStatus}`);
    }

    const response = await _http.head(
        `${registry}/v2/${repository}/manifests/${tag}`,
        {
            [Headers.Accept]: manifestTypes,
            Authorization: `Bearer ${result.token}`
        }
    );
    const status = response.message.statusCode;
    if (status !== 200) {
        throw new Error(`unexpected status from ghcr.io manifest: ${status}`);
    }
    const digest = response.message.headers["docker-content-digest"];
    const sha = typeof digest === "string" && digest.replace("sha256:", "");
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
    } catch {
        core.info(`sudo not found probably running in container`);
    }
    core.info(`running ${cmd}`);
    await exec(cmd);
}
