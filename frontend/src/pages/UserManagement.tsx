import React from 'react'
import { Box, Card, CardContent, Typography, Button } from '@mui/material'
import { People, Add } from '@mui/icons-material'

const UserManagement: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        직원 관리
      </Typography>
      
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            직원 관리 기능
          </Typography>
          <Typography color="text.secondary" paragraph>
            직원 정보 관리, 권한 설정, 인센티브 수식 설정 기능이 곧 구현됩니다.
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            직원 추가
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default UserManagement