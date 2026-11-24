import { describe, expect, it } from "vitest"
import { googleSearchURL } from "../src/utils/google.js"

describe("googleSearchURL", () => {
  it("builds an encoded Google search URL", () => {
    expect(googleSearchURL("web scraping")).toBe("https://www.google.com/search?q=web+scraping")
  })

  it("adds supported Google search parameters", () => {
    expect(
      googleSearchURL("web scraping", {
        gl: "us",
        hl: "en",
        start: 10,
        pws: "0",
        udm: "14",
        tbs: "qdr:w",
      }),
    ).toBe("https://www.google.com/search?q=web+scraping&gl=us&hl=en&start=10&pws=0&udm=14&tbs=qdr%3Aw")
  })
})
