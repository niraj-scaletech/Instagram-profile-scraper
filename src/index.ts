import { sequence_id } from "./config";
import { windows } from "@crawlora/browser";
import { Page } from "puppeteer-extra-plugin/dist/puppeteer";

type NonNegativeInteger<T extends number> = number extends T
  ? never
  : `${T}` extends `-${string}` | `${string}.${string}`
  ? never
  : T;

export default async function ({ urls }: { urls: string }) {
  const formedData = urls
    .trim()
    .split("\n")
    .map((v) => v.trim());

  await windows(formedData, async (url, { page, wait, output, debug }) => {
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      debug(`Navigate to ${url}`);

      await page.waitForSelector('[role="main"]', { timeout: 60000 });
      debug(`Main content loaded for ${url}`);

      const detail = await scrapeInstagram(page, wait, debug);

      await output.create({
        sequence_id,
        sequence_output: {
          Url: url,
          ...detail,
        },
      });
    } catch (error) {
      const e = error as Error;
      debug(`Error processing URL ${url}: ${e.message}`);
    }
  });
}

async function scrapeInstagram(
  page: Page,
  wait: <N extends number>(sec: NonNegativeInteger<N>) => Promise<void>,
  debug: debug.Debugger
) {
  try {
    const closeButton = await page.$(
      'div[role="dialog"] svg[aria-label="Close"]'
    );
    if (closeButton) {
      debug("Instagram dialog detected. Closing it...");
      await closeButton.click();
      await wait(1);
      debug("Dialog closed successfully.");
    }

    return await page.evaluate(() => {
      const [posts, followers, following] = Array.from(
        document.querySelectorAll("li.xl565be .x5n08af")
      ).map((el) => el.textContent?.trim() || "N/A");

      return {
        Posts: posts,
        Followers: followers,
        Following: following,
      };
    });
  } catch (error) {
    const e = error as Error;
    debug(`Error during scraping: ${e.message}`);
    return { Posts: "N/A", Followers: "N/A", Following: "N/A" };
  }
}
