import type { SVGAttributes } from "../../types.js";
import { overrideSvgAttributes } from "./overrideSvgAttributes.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const svgArbitrary = fc
  .record({
    start: fc.mixedCase(fc.constantFrom("<svg>")),
    middle: fc.fullUnicodeString(),
    end: fc.mixedCase(fc.constantFrom("</svg>")),
  })
  .map(({ start, middle, end }) => `${start}${middle}${end}`);

const SVGAttributesArbitrary = fc.record<SVGAttributes>({
  height: fc.option(fc.integer()),
  width: fc.option(fc.integer()),
  "aria-hidden": fc.option(fc.boolean()),
  "aria-label": fc.option(fc.string()),
  viewBox: fc.option(fc.string()),
  fill: fc.option(fc.string()),
  xmlns: fc.option(fc.string()),
});

describe("overrideSvgAtrributes", () => {
  it("should return the same output if no overrides are given", async () => {
    expect(await overrideSvgAttributes("<svg></svg>")).toBe("<svg></svg>");
    expect(await overrideSvgAttributes("<svg>")).toBe("<svg></svg>");
    expect(await overrideSvgAttributes("<SVG>")).toBe("<svg></svg>");
  });

  it("should strip leading and following whitespace", async () => {
    expect(await overrideSvgAttributes("  <svg>")).toBe("<svg></svg>");
    expect(await overrideSvgAttributes("    <svg></svg>")).toBe("<svg></svg>");
  });

  it("should override height and width", async () => {
    expect(
      await overrideSvgAttributes(`<svg height="100" width=40></svg>`, {
        height: 400,
        width: 20,
      })
    ).toBe('<svg height="400" width="20"></svg>');
  });

  it("should not include null and undefined properties", async () => {
    expect(
      await overrideSvgAttributes(`<svg></svg>`, {
        height: null,
        width: undefined,
      })
    ).toBe("<svg></svg>");
    expect(
      await overrideSvgAttributes(`<svg height="100" width=200></svg>`, {
        height: null,
        width: undefined,
      })
    ).toBe("<svg></svg>");
  });

  it("should throw an error if no svg is passed", async () => {
    await expect(
      async () => await overrideSvgAttributes("")
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"`svgSource` must have content"'
    );
  });

  it("should throw an error if svgSource doesn't start with `<svg`", async () => {
    await expect(
      async () => await overrideSvgAttributes("<div></div>")
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"`svgSource` must begin with `<svg`"'
    );
  });

  it("should add properties successfully", async () => {
    expect(
      await overrideSvgAttributes("<SVG></SVG>", {
        height: null,
        width: null,
        "aria-hidden": true,
        "aria-label": null,
        viewBox: "0 0 2712 894",
      })
    ).toBe('<svg aria-hidden="true" viewBox="0 0 2712 894"></svg>');

    await fc.assert(
      fc.asyncProperty(
        svgArbitrary,
        SVGAttributesArbitrary,
        fc.context(),
        async (svgSource, overrides, ctx) => {
          ctx.log(svgSource);
          const transformedSource = await overrideSvgAttributes(
            svgSource,
            overrides
          );
          ctx.log(transformedSource);
          expect(transformedSource).toBeTruthy();
          // every truthy override should exist in the transformed source
          Object.entries(overrides)
            .filter(([, value]) => {
              ctx.log(`${value}, ${!!value}`);
              return !!value;
            })
            .forEach(([override]) => {
              expect(transformedSource).toContain(override);
            });
        }
      )
    );
  });
});
