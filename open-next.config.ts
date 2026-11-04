// @ts-ignore
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default typeof defineCloudflareConfig === "function"
  ? defineCloudflareConfig({})
  : {};
