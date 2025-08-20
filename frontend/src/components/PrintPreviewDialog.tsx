import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Box,
  Divider,
  Grid
} from '@mui/material'
import { Print, Close } from '@mui/icons-material'

export interface PrintOptions {
  selectedOnly: boolean
  currentPageOnly: boolean
  includeHeader: boolean
  includeFooter: boolean
  includeSummary: boolean
  watermark: string
  orientation: 'portrait' | 'landscape'
  colorMode: 'color' | 'grayscale' | 'highContrast'
  fontSize: 'small' | 'normal' | 'large'
  includeBackgrounds: boolean
}

interface PrintPreviewDialogProps {
  open: boolean
  onClose: () => void
  onPrint: (options: PrintOptions) => void
  totalEmployees: number
  totalPayment: number
  selectedCount: number
  yearMonth: string
}

const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({
  open,
  onClose,
  onPrint,
  totalEmployees,
  totalPayment,
  selectedCount,
  yearMonth
}) => {
  const [options, setOptions] = useState<PrintOptions>({
    selectedOnly: false,
    currentPageOnly: false,
    includeHeader: true,
    includeFooter: true,
    includeSummary: true,
    watermark: '',
    orientation: 'landscape',
    colorMode: 'color',
    fontSize: 'normal',
    includeBackgrounds: true
  })

  const handlePrint = () => {
    onPrint(options)
    onClose()
  }

  const handleOptionChange = (field: keyof PrintOptions, value: any) => {
    setOptions({ ...options, [field]: value })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">인쇄 옵션</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {yearMonth} 급여 명세
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* 인쇄 범위 */}
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              인쇄 범위
            </Typography>
            <RadioGroup 
              value={options.selectedOnly ? 'selected' : 'all'}
              onChange={(e) => handleOptionChange('selectedOnly', e.target.value === 'selected')}
            >
              <FormControlLabel 
                value="all" 
                control={<Radio />} 
                label={`전체 직원 (${totalEmployees}명)`}
              />
              <FormControlLabel 
                value="selected" 
                control={<Radio />} 
                label={`선택된 직원만 (${selectedCount}명)`}
                disabled={selectedCount === 0}
              />
            </RadioGroup>
          </Grid>

          {/* 페이지 옵션 */}
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              페이지 옵션
            </Typography>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={options.currentPageOnly}
                  onChange={(e) => handleOptionChange('currentPageOnly', e.target.checked)}
                />
              }
              label="현재 페이지만 인쇄"
            />
          </Grid>

          {/* 포함 항목 */}
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              포함 항목
            </Typography>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.includeHeader}
                    onChange={(e) => handleOptionChange('includeHeader', e.target.checked)}
                  />
                }
                label="페이지 헤더 (제목, 날짜)"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.includeFooter}
                    onChange={(e) => handleOptionChange('includeFooter', e.target.checked)}
                  />
                }
                label="페이지 푸터 (페이지 번호, 인쇄일)"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.includeSummary}
                    onChange={(e) => handleOptionChange('includeSummary', e.target.checked)}
                  />
                }
                label={`요약 통계 포함 (총 ${totalEmployees}명, 총 지급액: ${totalPayment.toLocaleString()}원)`}
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.includeBackgrounds}
                    onChange={(e) => handleOptionChange('includeBackgrounds', e.target.checked)}
                  />
                }
                label="셀 배경색 포함"
              />
            </Box>
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>

          {/* 페이지 방향 */}
          <Grid size={6}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              페이지 방향
            </Typography>
            <RadioGroup
              row
              value={options.orientation}
              onChange={(e) => handleOptionChange('orientation', e.target.value)}
            >
              <FormControlLabel value="portrait" control={<Radio />} label="세로" />
              <FormControlLabel value="landscape" control={<Radio />} label="가로" />
            </RadioGroup>
          </Grid>

          {/* 글자 크기 */}
          <Grid size={6}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              글자 크기
            </Typography>
            <RadioGroup
              row
              value={options.fontSize}
              onChange={(e) => handleOptionChange('fontSize', e.target.value)}
            >
              <FormControlLabel value="small" control={<Radio />} label="작게" />
              <FormControlLabel value="normal" control={<Radio />} label="보통" />
              <FormControlLabel value="large" control={<Radio />} label="크게" />
            </RadioGroup>
          </Grid>

          {/* 보안 옵션 */}
          <Grid size={6}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              보안 워터마크
            </Typography>
            <FormControl fullWidth size="small">
              <Select 
                value={options.watermark}
                onChange={(e) => handleOptionChange('watermark', e.target.value)}
              >
                <MenuItem value="">워터마크 없음</MenuItem>
                <MenuItem value="CONFIDENTIAL">기밀 (CONFIDENTIAL)</MenuItem>
                <MenuItem value="DRAFT">초안 (DRAFT)</MenuItem>
                <MenuItem value="INTERNAL">내부용 (INTERNAL USE ONLY)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 스타일 옵션 */}
          <Grid size={6}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              인쇄 스타일
            </Typography>
            <RadioGroup
              row
              value={options.colorMode}
              onChange={(e) => handleOptionChange('colorMode', e.target.value)}
            >
              <FormControlLabel value="color" control={<Radio />} label="컬러" />
              <FormControlLabel value="grayscale" control={<Radio />} label="흑백" />
              <FormControlLabel value="highContrast" control={<Radio />} label="고대비" />
            </RadioGroup>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<Close />}>
          취소
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="contained" 
          startIcon={<Print />}
          color="primary"
        >
          인쇄
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PrintPreviewDialog