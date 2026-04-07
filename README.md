# SchoolMealMCP (학교 급식 MCP)

SchoolMealMCP는 MCP(Model Context Protocol) 기반 학교 급식 조회 서버입니다.  
[`school-kr`](https://github.com/leegeunhyeok/school-kr) 라이브러리를 사용하여 학교 검색 및 급식 정보를 제공합니다.

## 기능

SchoolMealMCP는 다음과 같은 기능을 제공합니다.

1. **통합 조회**: 학교명 또는 학교코드 입력만으로 급식 조회를 시도합니다.
2. **자동 검색**: 학교명만 입력하면 내부에서 학교를 검색한 뒤 급식을 조회합니다.
3. **날짜 지정 조회**: 연/월/일을 지정해 특정 달 또는 특정 일자의 급식을 조회할 수 있습니다.
4. **중복 학교 안내**: 같은 이름의 학교가 여러 개면 후보 목록과 `schoolCode`를 안내합니다.

## MCP 도구 목록

SchoolMealMCP는 다음 MCP 도구를 제공합니다.

1. `get_school_meal`
- 입력: `query?`, `schoolName?`, `schoolCode?`, `region?`, `schoolType?`, `year?`, `month?`, `day?`
- 설명: 학교명 또는 학교코드 기준으로 급식을 통합 조회합니다.

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
			"type": "stdio",
			"command": "npx",
			"args": [
				"-y",
				"schoolmealmcp"
			]
		}
	}
}
```