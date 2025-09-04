# FIX-03: HTML 중첩 규칙 위반 오류 수정

## 📋 개요
- **생성일**: 2025년 08월 23일
- **완료일**: 2025년 08월 23일  
- **우선순위**: MEDIUM
- **소요 시간**: 10분
- **상태**: ✅ 완료

## 🔴 문제 상황

### 오류 메시지
```
In HTML, <div> cannot be a descendant of <p>.
This will cause a hydration error.
```

### 발생 위치
- **파일**: `/frontend/src/components/department/PositionList.tsx`
- **줄 번호**: 67-89번 줄
- **컴포넌트**: ListItemText의 secondary prop

### 근본 원인
- MUI의 `ListItemText` 컴포넌트가 기본적으로 `secondary` prop을 `<p>` 태그로 렌더링
- secondary 내부에 `Box` (div)와 `Chip` (div) 컴포넌트를 사용
- HTML 규칙상 `<p>` 태그 안에 블록 레벨 요소인 `<div>`를 넣을 수 없음

## ✅ 해결 방법

### 수정 내용
```typescript
// PositionList.tsx 90-92번 줄 추가
<ListItemText
  primary={position.title}
  secondary={
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
      {/* Chip 컴포넌트들 */}
    </Box>
  }
  secondaryTypographyProps={{
    component: 'div'  // <p> 대신 <div>로 렌더링
  }}
/>
```

### 핵심 해결책
- `secondaryTypographyProps` prop 추가
- `component: 'div'`로 설정하여 `<p>` 대신 `<div>`로 렌더링

## 📝 구현 체크리스트

- [x] PositionList.tsx 파일 오류 위치 확인
- [x] ListItemText에 secondaryTypographyProps 추가
- [x] component를 'div'로 설정
- [x] 수정 후 hydration 오류 해결 확인

## 🔍 영향 범위
- PositionList 컴포넌트만 영향
- 부서 관리 페이지의 직급 목록 표시 부분
- 시각적 변화 없음 (HTML 구조만 변경)

## 📚 참고 사항
- MUI ListItemText 공식 문서: https://mui.com/api/list-item-text/
- HTML content model 규칙: Phrasing content인 `<p>`는 Flow content인 `<div>`를 포함할 수 없음
- React hydration 과정에서 서버와 클라이언트의 HTML 구조 불일치로 오류 발생

## ⚠️ 향후 주의사항
- ListItemText의 secondary에 복잡한 레이아웃을 넣을 때는 항상 `secondaryTypographyProps` 확인
- Typography 컴포넌트 사용 시 기본 HTML 요소 확인 필요
- 중첩 가능한 HTML 요소 규칙 숙지 필요