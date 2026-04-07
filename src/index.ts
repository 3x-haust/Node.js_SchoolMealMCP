#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import School from "school-kr";

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
  console.error(`[school-meal-mcp] unhandledRejection: ${message}`);
});

process.on("uncaughtException", (error: Error) => {
  console.error(`[school-meal-mcp] uncaughtException: ${error.stack ?? error.message}`);
});

const server = new McpServer({
  name: "school-meal-mcp",
  version: "1.1.0",
});

const REQUEST_TIMEOUT_MS = 8000;

const regionValues = [
  "SEOUL",
  "INCHEON",
  "BUSAN",
  "GWANGJU",
  "DAEJEON",
  "DAEGU",
  "SEJONG",
  "ULSAN",
  "GYEONGGI",
  "KANGWON",
  "CHUNGBUK",
  "CHUNGNAM",
  "GYEONGBUK",
  "GYEONGNAM",
  "JEONBUK",
  "JEONNAM",
  "JEJU",
] as const;

const regionSchema = z.enum(regionValues);

const schoolTypeValues = ["KINDERGARTEN", "ELEMENTARY", "MIDDLE", "HIGH"] as const;
const schoolTypeSchema = z.enum(schoolTypeValues);

type RegionKey = (typeof regionValues)[number];
type SchoolTypeKey = (typeof schoolTypeValues)[number];

type SchoolCandidate = {
  region: RegionKey;
  name: string;
  schoolCode: string;
  address: string;
};

const toLineBreak = (value: string) => value.replace(/<br\s*\/?\s*>/gi, "\n");

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error("REQUEST_TIMEOUT"));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

const toErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const maybeCode = "code" in error ? String(error.code) : "";
    if (maybeCode === "ETIMEDOUT") {
      return "교육청 급식 서버 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
    }

    const maybeMessage = "message" in error ? String(error.message) : "";
    if (maybeMessage.includes("REQUEST_TIMEOUT")) {
      return "급식 조회가 시간 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (maybeMessage) {
      return `급식 조회 중 오류가 발생했습니다: ${maybeMessage}`;
    }
  }

  return "급식 조회 중 알 수 없는 오류가 발생했습니다.";
};

const searchSchools = async (region: RegionKey, schoolName: string) => {
  const school = new School();
  const result = await withTimeout(school.search(School.Region[region], schoolName));

  return result.map((item) => ({
    region,
    name: item.name,
    schoolCode: item.schoolCode,
    address: item.address,
  })) as SchoolCandidate[];
};

const resolveCandidates = async (schoolName: string, region?: RegionKey) => {
  if (region) {
    return searchSchools(region, schoolName);
  }

  for (const eachRegion of regionValues) {
    const result = await searchSchools(eachRegion, schoolName);
    if (result.length > 0) {
      return result;
    }
  }

  return [] as SchoolCandidate[];
};

const getMealBySchool = async ({
  region,
  schoolCode,
  schoolType,
  year,
  month,
}: {
  region: RegionKey;
  schoolCode: string;
  schoolType?: SchoolTypeKey;
  year?: number;
  month?: number;
}) => {
  const school = new School();
  const tryTypes = schoolType ? [schoolType] : [...schoolTypeValues];
  let lastError: unknown;

  for (const eachType of tryTypes) {
    try {
      school.init(School.Type[eachType], School.Region[region], schoolCode);
      const meal = await withTimeout(school.getMeal(year, month));

      return { meal, schoolType: eachType };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("MEAL_LOOKUP_FAILED");
};

server.registerTool(
  "get_school_meal",
  {
    title: "학교 급식 조회(통합)",
    description: "학교 이름 또는 학교 코드로 급식을 조회합니다.",
    inputSchema: {
      query: z.string().min(1).optional(),
      schoolName: z.string().min(1).optional(),
      schoolCode: z.string().optional(),
      region: regionSchema.optional(),
      schoolType: schoolTypeSchema.optional(),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      day: z.number().int().min(1).max(31).optional(),
    },
  },
  async ({ query, schoolName, schoolCode, region, schoolType, year, month, day }) => {
    try {
      const normalizedName = schoolName ?? (query && /^\d+$/.test(query) ? undefined : query);
      const normalizedCode = schoolCode ?? (query && /^\d+$/.test(query) ? query : undefined);

      if (!normalizedName && !normalizedCode) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "schoolName 또는 schoolCode(또는 query)를 입력해 주세요.",
            },
          ],
        };
      }

      if (normalizedCode && !region && !normalizedName) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "schoolCode만으로는 지역을 알 수 없습니다. region을 함께 입력하거나 schoolName을 사용해 주세요.",
            },
          ],
        };
      }

      let targetSchool: SchoolCandidate | undefined;
      let selectedSchoolType: SchoolTypeKey | undefined = schoolType;

      if (normalizedCode && region && !normalizedName) {
        const mealResult = await getMealBySchool({
          region,
          schoolCode: normalizedCode,
          schoolType,
          year,
          month,
        });

        const mealText = day ? mealResult.meal[String(day) as keyof typeof mealResult.meal] : mealResult.meal.today;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  school: {
                    region,
                    schoolCode: normalizedCode,
                    name: normalizedName ?? "",
                  },
                  date: {
                    year: mealResult.meal.year,
                    month: mealResult.meal.month,
                    day: day ?? mealResult.meal.day,
                  },
                  schoolType: mealResult.schoolType,
                  meal: typeof mealText === "string" ? toLineBreak(mealText) : "",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const candidates = await resolveCandidates(normalizedName!, region);

      if (candidates.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "검색된 학교가 없습니다." }],
        };
      }

      if (normalizedCode) {
        targetSchool = candidates.find((item) => item.schoolCode === normalizedCode);
        if (!targetSchool) {
          return {
            isError: true,
            content: [{ type: "text", text: "입력한 schoolCode와 일치하는 학교를 찾을 수 없습니다." }],
          };
        }
      } else if (candidates.length === 1) {
        targetSchool = candidates[0];
      } else {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "동일한 이름의 학교가 여러 개입니다. schoolCode를 함께 입력해 주세요.",
                  candidates: candidates.slice(0, 10),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      if (!targetSchool) {
        return {
          isError: true,
          content: [{ type: "text", text: "학교를 찾을 수 없습니다." }],
        };
      }

      const mealResult = await getMealBySchool({
        region: targetSchool.region,
        schoolCode: targetSchool.schoolCode,
        schoolType: selectedSchoolType,
        year,
        month,
      });
      selectedSchoolType = mealResult.schoolType;
      const meal = mealResult.meal;
      const mealText = day ? meal[String(day) as keyof typeof meal] : meal.today;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                school: targetSchool,
                date: {
                  year: meal.year,
                  month: meal.month,
                  day: day ?? meal.day,
                },
                schoolType: selectedSchoolType,
                meal: typeof mealText === "string" ? toLineBreak(mealText) : "",
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: toErrorMessage(error) }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);


