#!/usr/bin/env python3
"""
자동으로 문서의 날짜를 업데이트하는 스크립트
Claude Code에서 사용하기 위한 도구
"""

import re
import sys
from datetime import datetime
from pathlib import Path

def get_today_date(format_type='kr'):
    """오늘 날짜를 지정된 형식으로 반환"""
    today = datetime.now()
    
    formats = {
        'kr': today.strftime('%Y년 %m월 %d일'),
        'iso': today.strftime('%Y-%m-%d'),
        'dot': today.strftime('%Y.%m.%d'),
        'slash': today.strftime('%Y/%m/%d'),
        'us': today.strftime('%B %d, %Y')
    }
    
    return formats.get(format_type, formats['kr'])

def update_date_in_file(file_path, pattern, new_date):
    """파일 내의 날짜 패턴을 새 날짜로 업데이트"""
    path = Path(file_path)
    if not path.exists():
        print(f"파일이 존재하지 않습니다: {file_path}")
        return False
    
    content = path.read_text(encoding='utf-8')
    updated_content = re.sub(pattern, new_date, content)
    
    if content != updated_content:
        path.write_text(updated_content, encoding='utf-8')
        print(f"날짜 업데이트 완료: {file_path}")
        return True
    else:
        print(f"변경사항 없음: {file_path}")
        return False

def update_markdown_date_fields(file_path):
    """마크다운 파일의 일반적인 날짜 필드 업데이트"""
    today_kr = get_today_date('kr')
    today_iso = get_today_date('iso')
    today_dot = get_today_date('dot')
    
    patterns = [
        # - **작성일**: 2025년 01월 20일
        (r'(\*\*작성일\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # - **작성 일자**: 2025년 01월 20일
        (r'(\*\*작성 일자\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # - **완료일**: 2025년 01월 20일
        (r'(^-\s*\*\*완료일\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # - **수정일**: 2025년 01월 20일
        (r'(\*\*수정일\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # - **보류 일자**: 2025년 01월 20일
        (r'(\*\*보류 일자\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # - **취소 일자**: 2025년 01월 20일
        (r'(\*\*취소 일자\*\*:\s*)(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', f'\\1{today_kr}'),
        # ### 오늘 (2025.08.21)
        (r'(###\s*오늘\s*\()(\d{4}\.\d{2}\.\d{2})(\))', f'\\1{today_dot}\\3'),
        # Date: 2025-08-21
        (r'(Date:\s*)(\d{4}-\d{2}-\d{2})', f'\\1{today_iso}'),
    ]
    
    path = Path(file_path)
    if not path.exists():
        print(f"파일이 존재하지 않습니다: {file_path}")
        return
    
    content = path.read_text(encoding='utf-8')
    updated = False
    
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content
            updated = True
    
    if updated:
        path.write_text(content, encoding='utf-8')
        print(f"날짜 필드 업데이트 완료: {file_path}")
    else:
        print(f"업데이트할 날짜 필드 없음: {file_path}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"오늘 날짜:")
        print(f"  한국어: {get_today_date('kr')}")
        print(f"  ISO: {get_today_date('iso')}")
        print(f"  Dot: {get_today_date('dot')}")
        print(f"\n사용법:")
        print(f"  {sys.argv[0]} <file_path> - 파일의 날짜 필드 자동 업데이트")
        print(f"  {sys.argv[0]} kr|iso|dot - 특정 형식으로 날짜 출력")
    elif sys.argv[1] in ['kr', 'iso', 'dot', 'slash', 'us']:
        print(get_today_date(sys.argv[1]))
    else:
        update_markdown_date_fields(sys.argv[1])