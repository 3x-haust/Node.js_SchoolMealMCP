# SchoolMealMCP (학교 급식 MCP)

SchoolMealMCP는 MCP(Model Context Protocol) 기반 학교 급식 조회 서버입니다.  
[`school-kr`](https://github.com/leegeunhyeok/school-kr) 라이브러리를 사용하여 학교 검색 및 급식 정보를 제공합니다.

## 기능

SchoolMealMCP는 다음과 같은 기능을 제공합니다.

1. **학교 검색**: 지역과 학교명을 기반으로 학교 목록을 검색합니다.
2. **급식 조회**: 학교명(및 선택적으로 학교 코드)을 기반으로 급식 정보를 조회합니다.
3. **날짜 지정 조회**: 연/월/일을 지정해 특정 달 또는 특정 일자의 급식을 조회할 수 있습니다.
4. **자동 선택 지원**: 같은 이름의 학교가 여러 개일 때 `schoolCode`로 정확한 학교를 선택할 수 있습니다.

## MCP 도구 목록

SchoolMealMCP는 다음 MCP 도구를 제공합니다.

1. `search_schools`
- 입력: `region`, `schoolName`
- 설명: 지역과 학교명으로 학교 목록을 반환합니다.

2. `get_school_meal`
- 입력: `region`, `schoolType`, `schoolName`, `schoolCode?`, `year?`, `month?`, `day?`
- 설명: 조건에 맞는 학교의 급식 정보를 반환합니다.

## 설치 방법

### 요구 사항
- Node.js 18+
- npm

### 의존성 설치

```bash
npm install
```

### 빌드

```bash
npm run build
```

빌드가 완료되면 실행 파일이 `build/index.js`에 생성됩니다.

## 사용 방법

MCP 클라이언트(예: Claude Desktop, Cursor 등)의 설정 파일에 다음과 같이 서버를 등록할 수 있습니다.

```json
{
	"mcpServers": {
		"school-meal-mcp": {
			"command": "npx",
			"args": ["-y", "schoolmealmcp"],
			"env": {}
		}
	}
}
```