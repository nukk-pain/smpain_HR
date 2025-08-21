#!/usr/bin/env python3
"""
Progress Sync Script for Claude Code
작업 진행 상황을 자동으로 동기화합니다.
"""

import os
import re
from datetime import datetime
from pathlib import Path

class ProgressSync:
    def __init__(self):
        self.root_dir = Path('/mnt/d/my_programs/HR')
        self.todo_file = self.root_dir / 'todo-development.md'
        self.index_file = self.root_dir / 'INDEX-PLAN.md'
        self.completed_tasks = []
        self.in_progress_tasks = []
        
    def scan_plan_files(self):
        """모든 plan 파일 스캔"""
        plan_files = list(self.root_dir.glob('*-plan.md'))
        plan_files.extend(list(self.root_dir.glob('FEAT-*-plan.md')))
        
        for plan_file in plan_files:
            self.extract_progress(plan_file)
            
    def extract_progress(self, plan_file):
        """plan 파일에서 진행 상황 추출"""
        with open(plan_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 완료된 작업 찾기
        completed = re.findall(r'- \[x\] (.+?)(?:\n|$)', content)
        # 진행중 작업 찾기
        in_progress = re.findall(r'- \[ \] (.+?)(?:🔄|진행중)', content)
        
        for task in completed:
            self.completed_tasks.append({
                'file': plan_file.name,
                'task': task,
                'date': datetime.now().strftime('%Y.%m.%d')
            })
            
        for task in in_progress:
            self.in_progress_tasks.append({
                'file': plan_file.name,
                'task': task
            })
            
    def update_todo_file(self):
        """todo-development.md 업데이트"""
        if not self.todo_file.exists():
            print(f"⚠️  {self.todo_file} 파일이 없습니다.")
            return
            
        with open(self.todo_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 진행 상황 업데이트 로직
        updated_content = self.update_progress_in_content(content)
        
        with open(self.todo_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
            
        print(f"✅ {self.todo_file.name} 업데이트 완료")
        
    def update_progress_in_content(self, content):
        """콘텐츠에서 진행 상황 업데이트"""
        # 완료된 작업 표시
        for task in self.completed_tasks:
            pattern = rf'- \[ \] (.*{re.escape(task["task"][:30])}.*)'
            replacement = rf'- [x] \1 ✅ ({task["date"]} 완료)'
            content = re.sub(pattern, replacement, content)
            
        return content
        
    def calculate_progress(self):
        """전체 진행률 계산"""
        total_tasks = len(self.completed_tasks) + len(self.in_progress_tasks)
        if total_tasks == 0:
            return 0
        return round((len(self.completed_tasks) / total_tasks) * 100, 1)
        
    def generate_summary(self):
        """동기화 요약 생성"""
        progress = self.calculate_progress()
        
        summary = f"""
📊 Progress Sync Report
=======================
📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}
✅ Completed: {len(self.completed_tasks)} tasks
🔄 In Progress: {len(self.in_progress_tasks)} tasks  
📈 Overall Progress: {progress}%

Recent Completions:
"""
        for task in self.completed_tasks[-5:]:
            summary += f"  • {task['task'][:50]}... ({task['date']})\n"
            
        return summary
        
    def run(self):
        """동기화 실행"""
        print("🔄 Progress sync 시작...")
        
        self.scan_plan_files()
        self.update_todo_file()
        
        summary = self.generate_summary()
        print(summary)
        
        # 요약을 파일로 저장
        sync_log = self.root_dir / '.sync-log.txt'
        with open(sync_log, 'w', encoding='utf-8') as f:
            f.write(summary)
            
        print(f"📝 동기화 로그: {sync_log}")
        
if __name__ == "__main__":
    sync = ProgressSync()
    sync.run()