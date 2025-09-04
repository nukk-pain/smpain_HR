#!/usr/bin/env python3
"""
Auto-detect Progress Script
코드 변경사항과 테스트 결과를 분석해 자동으로 완료된 작업을 감지합니다.
"""

import os
import re
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
import subprocess

class AutoProgressDetector:
    def __init__(self):
        self.root_dir = Path('/mnt/d/my_programs/HR')
        self.state_file = self.root_dir / '.progress-state.json'
        self.current_state = self.load_state()
        self.detected_completions = []
        
    def load_state(self):
        """이전 상태 로드"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return {
            'file_hashes': {},
            'test_results': {},
            'last_check': None,
            'completed_tasks': []
        }
        
    def save_state(self):
        """현재 상태 저장"""
        with open(self.state_file, 'w') as f:
            json.dump(self.current_state, f, indent=2)
            
    def get_file_hash(self, filepath):
        """파일의 해시값 계산"""
        if not filepath.exists():
            return None
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
            
    def detect_code_changes(self):
        """코드 변경사항 감지"""
        patterns = {
            'excel_export': [
                'backend/routes/admin/leaveAdmin.js',
                'backend/services/LeaveExcelService.js',
                'frontend/src/components/UnifiedLeaveOverview.tsx'
            ],
            'virtual_scroll': [
                'frontend/src/components/VirtualScrollList.tsx',
                'frontend/package.json'  # react-window 추가 확인
            ],
            'charts': [
                'frontend/src/components/LeaveCharts.tsx',
                'frontend/package.json'  # recharts 추가 확인
            ]
        }
        
        changes = {}
        for feature, files in patterns.items():
            for file_path in files:
                full_path = self.root_dir / file_path
                if full_path.exists():
                    current_hash = self.get_file_hash(full_path)
                    old_hash = self.current_state['file_hashes'].get(str(full_path))
                    
                    if old_hash and current_hash != old_hash:
                        changes[feature] = changes.get(feature, [])
                        changes[feature].append(file_path)
                        
                    self.current_state['file_hashes'][str(full_path)] = current_hash
                    
        return changes
        
    def check_test_results(self):
        """테스트 실행 결과 확인"""
        test_indicators = []
        
        # Jest/Vitest 테스트 결과 파일 확인
        test_result_files = [
            'frontend/coverage/coverage-summary.json',
            'backend/coverage/coverage-summary.json',
            'test-results.json'
        ]
        
        for result_file in test_result_files:
            path = self.root_dir / result_file
            if path.exists():
                # 파일 수정 시간 확인
                mtime = datetime.fromtimestamp(path.stat().st_mtime)
                if not self.current_state['last_check'] or \
                   mtime > datetime.fromisoformat(self.current_state['last_check']):
                    test_indicators.append(result_file)
                    
        return test_indicators
        
    def analyze_plan_files(self):
        """Plan 파일에서 작업 목록과 구현 패턴 분석"""
        task_patterns = {}
        
        plan_files = list(self.root_dir.glob('*-plan.md'))
        plan_files.extend(list(self.root_dir.glob('FEAT-*-plan.md')))
        
        for plan_file in plan_files:
            with open(plan_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 미완료 작업 찾기
            pending_tasks = re.findall(r'- \[ \] (.+?)(?:\n|$)', content)
            
            for task in pending_tasks:
                # 작업과 관련된 파일/함수 패턴 추출
                if 'Excel' in task or 'excel' in task:
                    task_patterns[task] = {
                        'files': ['LeaveExcelService', 'exportExcel'],
                        'type': 'excel_export'
                    }
                elif 'virtual' in task.lower() or 'scroll' in task.lower():
                    task_patterns[task] = {
                        'files': ['VirtualScroll', 'react-window'],
                        'type': 'virtual_scroll'
                    }
                elif 'test' in task.lower():
                    task_patterns[task] = {
                        'files': ['.test.', '.spec.'],
                        'type': 'test'
                    }
                    
        return task_patterns
        
    def detect_implementation(self, task_patterns):
        """패턴 기반으로 구현 완료 감지"""
        completed = []
        
        for task, pattern in task_patterns.items():
            # 관련 파일 존재 확인
            for file_pattern in pattern['files']:
                # Frontend 파일 검색
                frontend_files = list(self.root_dir.glob(f'frontend/**/*{file_pattern}*'))
                backend_files = list(self.root_dir.glob(f'backend/**/*{file_pattern}*'))
                
                if frontend_files or backend_files:
                    # 파일이 최근에 생성/수정되었는지 확인
                    for f in frontend_files + backend_files:
                        mtime = datetime.fromtimestamp(f.stat().st_mtime)
                        # 최근 24시간 내 수정된 파일
                        if mtime > datetime.now() - timedelta(hours=24):
                            completed.append({
                                'task': task,
                                'evidence': f'File created/modified: {f.name}',
                                'type': pattern['type']
                            })
                            break
                            
        return completed
        
    def check_running_services(self):
        """실행 중인 서비스와 포트 확인"""
        indicators = {}
        
        try:
            # 포트 확인 (개발 서버)
            result = subprocess.run(['ss', '-tuln'], capture_output=True, text=True)
            output = result.stdout
            
            if ':3727' in output:  # Frontend dev server
                indicators['frontend'] = 'running'
            if ':5455' in output or ':5456' in output:  # Backend server
                indicators['backend'] = 'running'
                
            # npm scripts 실행 확인
            ps_result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
            ps_output = ps_result.stdout
            
            if 'npm run dev' in ps_output or 'vite' in ps_output:
                indicators['dev_mode'] = True
                
        except:
            pass
            
        return indicators
        
    def infer_completions(self):
        """모든 신호를 종합해 완료된 작업 추론"""
        completions = []
        
        # 1. 코드 변경사항 확인
        code_changes = self.detect_code_changes()
        
        # 2. 테스트 결과 확인
        test_results = self.check_test_results()
        
        # 3. Plan 파일 분석
        task_patterns = self.analyze_plan_files()
        
        # 4. 구현 완료 감지
        detected = self.detect_implementation(task_patterns)
        
        # 5. 실행 중인 서비스 확인
        services = self.check_running_services()
        
        # 종합 분석
        confidence_scores = {}
        
        for item in detected:
            task = item['task']
            score = 0
            evidence = []
            
            # 파일 생성/수정 (40점)
            if item['evidence']:
                score += 40
                evidence.append(item['evidence'])
                
            # 관련 코드 변경 (30점)
            if item['type'] in code_changes:
                score += 30
                evidence.append(f"Related files changed: {', '.join(code_changes[item['type']])}")
                
            # 테스트 실행 (20점)
            if test_results:
                score += 20
                evidence.append("Tests executed recently")
                
            # 서비스 실행 중 (10점)
            if services.get('dev_mode'):
                score += 10
                evidence.append("Development server running")
                
            if score >= 60:  # 60점 이상이면 완료로 판단
                completions.append({
                    'task': task,
                    'confidence': score,
                    'evidence': evidence,
                    'timestamp': datetime.now().isoformat()
                })
                
        return completions
        
    def update_plan_files(self, completions):
        """Plan 파일 자동 업데이트"""
        updates = []
        
        for completion in completions:
            task = completion['task']
            
            # 모든 plan 파일에서 해당 task 찾기
            plan_files = list(self.root_dir.glob('*-plan.md'))
            plan_files.extend(list(self.root_dir.glob('FEAT-*-plan.md')))
            
            for plan_file in plan_files:
                with open(plan_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 정확한 task 매칭
                pattern = rf'- \[ \] ({re.escape(task[:50])}.*?)(?:\n|$)'
                if re.search(pattern, content):
                    # 체크박스 업데이트
                    new_content = re.sub(
                        pattern,
                        rf'- [x] \1 ✅ ({datetime.now().strftime("%Y.%m.%d")} 자동 감지)',
                        content
                    )
                    
                    with open(plan_file, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                        
                    updates.append({
                        'file': plan_file.name,
                        'task': task,
                        'confidence': completion['confidence']
                    })
                    
        return updates
        
    def generate_report(self, completions, updates):
        """감지 결과 리포트 생성"""
        report = f"""
🤖 Auto-Detection Report
========================
📅 Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}
🔍 Detected Completions: {len(completions)}

"""
        if completions:
            report += "✅ Completed Tasks (Auto-detected):\n"
            report += "=" * 50 + "\n\n"
            
            for comp in completions:
                report += f"📌 Task: {comp['task'][:60]}...\n"
                report += f"   Confidence: {comp['confidence']}%\n"
                report += f"   Evidence:\n"
                for ev in comp['evidence']:
                    report += f"     • {ev}\n"
                report += "\n"
                
        if updates:
            report += "📝 Files Updated:\n"
            report += "-" * 30 + "\n"
            for update in updates:
                report += f"  • {update['file']}: {update['task'][:40]}...\n"
                
        else:
            report += "ℹ️  No new completions detected.\n"
            report += "\n💡 Hints for detection:\n"
            report += "  • Create/modify implementation files\n"
            report += "  • Run tests\n"
            report += "  • Keep dev server running\n"
            
        return report
        
    def run(self, auto_update=False):
        """자동 감지 실행"""
        print("🔍 자동 완료 감지 시작...")
        
        # 완료 작업 추론
        completions = self.infer_completions()
        
        updates = []
        if completions:
            if auto_update:
                # 자동 업데이트 모드
                updates = self.update_plan_files(completions)
                print(f"✅ {len(updates)}개 파일 자동 업데이트 완료")
            else:
                # 확인 모드
                print(f"🔔 {len(completions)}개 완료 작업 감지됨")
                print("자동 업데이트하려면 --auto 옵션을 사용하세요")
                
        # 상태 저장
        self.current_state['last_check'] = datetime.now().isoformat()
        self.current_state['completed_tasks'].extend([c['task'] for c in completions])
        self.save_state()
        
        # 리포트 생성
        report = self.generate_report(completions, updates)
        print(report)
        
        # 리포트 파일 저장
        report_file = self.root_dir / '.detection-report.md'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
            
        return len(completions)

if __name__ == "__main__":
    import sys
    
    detector = AutoProgressDetector()
    auto_mode = '--auto' in sys.argv or 'auto' in sys.argv
    
    result = detector.run(auto_update=auto_mode)
    sys.exit(0 if result >= 0 else 1)