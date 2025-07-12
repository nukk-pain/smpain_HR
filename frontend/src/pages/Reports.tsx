import React from 'react'
import { Box, Card, CardContent, Typography, Button } from '@mui/material'
import { Assessment, Download } from '@mui/icons-material'

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        보고서
      </Typography>
      
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            보고서 생성 기능
          </Typography>
          <Typography color="text.secondary" paragraph>
            급여 보고서, 휴가 현황 보고서, PDF 다운로드 기능이 곧 구현됩니다.
          </Typography>
          <Button variant="contained" startIcon={<Download />}>
            보고서 다운로드
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Reports