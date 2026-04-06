#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import School from "school-kr";

const server = new McpServer({
  name: "school-meal-mcp",
  version: "1.0.0",
});

const regionSchema = z.enum([
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
]);

const schoolTypeSchema = z.enum(["KINDERGARTEN", "ELEMENTARY", "MIDDLE", "HIGH"]);

const toLineBreak = (value: string) => value.replace(/<br\s*\/?\s*>/gi, "\n");

server.registerTool(
  "search_schools",
  {
    title: "학교 검색",
    description: "지역과 학교명으로 학교 목록을 검색합니다.",
    inputSchema: {
      region: regionSchema,
      schoolName: z.string().min(1),
    },
  },
  async ({ region, schoolName }) => {
    const school = new School();
    const result = await school.search(School.Region[region], schoolName);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "get_school_meal",
  {
    title: "학교 급식 조회",
    description: "학교 급식 정보를 조회합니다.",
    inputSchema: {
      region: regionSchema,
      schoolType: schoolTypeSchema,
      schoolName: z.string().min(1),
      schoolCode: z.string().optional(),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      day: z.number().int().min(1).max(31).optional(),
    },
  },
  async ({ region, schoolType, schoolName, schoolCode, year, month, day }) => {
    const school = new School();
    const schools = await school.search(School.Region[region], schoolName);

    if (schools.length === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: "검색된 학교가 없습니다." }],
      };
    }

    const targetSchool = schoolCode
      ? schools.find((item) => item.schoolCode === schoolCode)
      : schools[0];

    if (!targetSchool) {
      return {
        isError: true,
        content: [{ type: "text", text: "schoolCode에 해당하는 학교를 찾을 수 없습니다." }],
      };
    }

    school.init(School.Type[schoolType], School.Region[region], targetSchool.schoolCode);

    const meal = await school.getMeal(year, month);
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
              meal: typeof mealText === "string" ? toLineBreak(mealText) : "",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);


