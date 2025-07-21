import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'

const UserManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        직원 관리
      </h1>
      
      <Card>
        <CardContent className="text-center py-16">
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">
            직원 관리 기능
          </h2>
          <p className="text-muted-foreground mb-6">
            직원 정보 관리, 권한 설정, 인센티브 수식 설정 기능이 곧 구현됩니다.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            직원 추가
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserManagement