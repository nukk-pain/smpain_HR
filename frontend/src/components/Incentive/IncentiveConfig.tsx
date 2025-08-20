/**
 * AI-HEADER
 * @intent: Component for configuring employee incentive calculations
 * @domain_meaning: UI for managing commission settings per employee
 * @misleading_names: None
 * @data_contracts: Uses IncentiveConfig type, communicates with incentive API
 * @pii: Shows userId but no sensitive personal data
 * @invariants: Config must be valid before saving, admin-only editing
 * @rag_keywords: incentive config UI, commission settings component
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Box,
  Divider,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import { Save, Edit, Cancel } from '@mui/icons-material';
import { apiService } from '../../services/api';
import { useNotification } from '../NotificationProvider';
import { useAuth } from '../AuthProvider';
import {
  IncentiveConfig as IIncentiveConfig,
  IncentiveType,
  IncentiveTypeInfo,
  INCENTIVE_TYPE_LABELS,
  INCENTIVE_TYPE_DESCRIPTIONS,
  DEFAULT_INCENTIVE_CONFIG
} from '../../types/incentive';
import ParameterInputs from './ParameterInputs';
import CustomFormulaEditor from './CustomFormulaEditor';
import SimulationPanel from './SimulationPanel';

interface IncentiveConfigProps {
  userId: string;
  userName?: string;
  isReadOnly?: boolean;
  onConfigChange?: (config: IIncentiveConfig) => void;
}

const IncentiveConfig: React.FC<IncentiveConfigProps> = ({
  userId,
  userName,
  isReadOnly = false,
  onConfigChange
}) => {
  const [config, setConfig] = useState<IIncentiveConfig>(DEFAULT_INCENTIVE_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<IIncentiveConfig>(DEFAULT_INCENTIVE_CONFIG);
  const [incentiveTypes, setIncentiveTypes] = useState<IncentiveTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { user } = useAuth();
  const { showNotification } = useNotification();

  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin && !isReadOnly;

  // Load incentive types
  useEffect(() => {
    loadIncentiveTypes();
  }, []);

  // Load user's incentive configuration
  useEffect(() => {
    if (userId) {
      loadIncentiveConfig();
    }
  }, [userId]);

  const loadIncentiveTypes = async () => {
    try {
      console.log('Loading incentive types...');
      const response = await apiService.getIncentiveTypes();
      console.log('Incentive types response:', response);
      if (response.success && response.data) {
        console.log('Setting incentive types:', response.data);
        setIncentiveTypes(response.data);
      } else {
        console.error('No data in response:', response);
        // Fallback to hardcoded types if API fails
        const fallbackTypes = [
          { value: 'PERSONAL_PERCENT', name: '개인 매출 비율', description: '개인 매출의 X%', requiredParams: ['rate'] },
          { value: 'TOTAL_PERCENT', name: '전체 매출 비율', description: '전체 매출의 X%', requiredParams: ['rate'] },
          { value: 'PERSONAL_EXCESS', name: '개인 매출 초과분', description: '개인 매출 중 기준 금액 초과분의 X%', requiredParams: ['threshold', 'rate'] },
          { value: 'TOTAL_EXCESS', name: '전체 매출 초과분', description: '전체 매출 중 기준 금액 초과분의 X%', requiredParams: ['threshold', 'rate'] },
          { value: 'CUSTOM', name: '커스텀 수식', description: '사용자 정의 수식', requiredParams: [] }
        ];
        setIncentiveTypes(fallbackTypes as IncentiveTypeInfo[]);
      }
    } catch (error) {
      console.error('Failed to load incentive types:', error);
      showNotification('error', 'Error', 'Failed to load incentive types');
      // Fallback to hardcoded types if API fails
      const fallbackTypes = [
        { value: 'PERSONAL_PERCENT', name: '개인 매출 비율', description: '개인 매출의 X%', requiredParams: ['rate'] },
        { value: 'TOTAL_PERCENT', name: '전체 매출 비율', description: '전체 매출의 X%', requiredParams: ['rate'] },
        { value: 'PERSONAL_EXCESS', name: '개인 매출 초과분', description: '개인 매출 중 기준 금액 초과분의 X%', requiredParams: ['threshold', 'rate'] },
        { value: 'TOTAL_EXCESS', name: '전체 매출 초과분', description: '전체 매출 중 기준 금액 초과분의 X%', requiredParams: ['threshold', 'rate'] },
        { value: 'CUSTOM', name: '커스텀 수식', description: '사용자 정의 수식', requiredParams: [] }
      ];
      setIncentiveTypes(fallbackTypes as IncentiveTypeInfo[]);
    }
  };

  const loadIncentiveConfig = async () => {
    setLoading(true);
    try {
      const response = await apiService.getIncentiveConfig(userId);
      if (response.success && response.data) {
        const loadedConfig = response.data;
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
        
        // Check if CUSTOM type to enable advanced mode
        if (loadedConfig.type === 'CUSTOM') {
          setAdvancedMode(true);
        }
      }
    } catch (error) {
      console.error('Failed to load incentive config:', error);
      showNotification('error', 'Error', 'Failed to load incentive configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: IncentiveType) => {
    // Find the type info to get required parameters
    const typeInfo = incentiveTypes.find(t => t.value === newType);
    
    // Reset parameters based on new type
    const newParameters: any = {};
    if (typeInfo) {
      typeInfo.requiredParams.forEach(param => {
        if (param === 'rate') newParameters.rate = 0.05;
        if (param === 'threshold') newParameters.threshold = 5000000;
      });
    }

    setConfig({
      ...config,
      type: newType,
      parameters: newParameters,
      customFormula: newType === 'CUSTOM' ? config.customFormula || '' : undefined
    });
  };

  const handleParametersChange = (newParameters: any) => {
    setConfig({
      ...config,
      parameters: newParameters
    });
  };

  const handleFormulaChange = (formula: string) => {
    setConfig({
      ...config,
      customFormula: formula
    });
  };

  const validateConfig = async (): Promise<boolean> => {
    const errors: string[] = [];

    // Check type
    if (!config.type) {
      errors.push('인센티브 유형을 선택해주세요');
    }

    // Check parameters
    if (config.type !== 'CUSTOM') {
      const typeInfo = incentiveTypes.find(t => t.value === config.type);
      if (typeInfo) {
        typeInfo.requiredParams.forEach(param => {
          if (config.parameters[param] === undefined) {
            errors.push(`${param} 값이 필요합니다`);
          }
        });
      }

      // Validate rate range
      if (config.parameters.rate !== undefined) {
        if (config.parameters.rate < 0 || config.parameters.rate > 1) {
          errors.push('요율은 0에서 1 사이여야 합니다');
        }
      }

      // Validate threshold
      if (config.parameters.threshold !== undefined && config.parameters.threshold < 0) {
        errors.push('기준 금액은 0 이상이어야 합니다');
      }

      // Validate min/max
      if (config.parameters.minAmount !== undefined && config.parameters.minAmount < 0) {
        errors.push('최소 금액은 0 이상이어야 합니다');
      }
      if (config.parameters.maxAmount !== undefined && config.parameters.maxAmount < 0) {
        errors.push('최대 금액은 0 이상이어야 합니다');
      }
      if (config.parameters.minAmount && config.parameters.maxAmount) {
        if (config.parameters.minAmount > config.parameters.maxAmount) {
          errors.push('최소 금액이 최대 금액보다 클 수 없습니다');
        }
      }
    } else {
      // Validate custom formula
      if (!config.customFormula) {
        errors.push('커스텀 수식을 입력해주세요');
      } else {
        try {
          const validationResponse = await apiService.validateIncentiveFormula(config.customFormula);
          if (!validationResponse.success || !validationResponse.data?.isValid) {
            errors.push(...(validationResponse.data?.errors || ['수식 검증 실패']));
          }
        } catch (error) {
          errors.push('수식 검증 중 오류가 발생했습니다');
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    const isValid = await validateConfig();
    if (!isValid) {
      showNotification('error', 'Error', '설정을 확인해주세요');
      return;
    }

    setSaving(true);
    try {
      const response = await apiService.updateIncentiveConfig(userId, {
        type: config.type,
        parameters: config.parameters as Record<string, number>,
        customFormula: config.customFormula,
        isActive: config.isActive,
        effectiveDate: config.effectiveDate as string
      });

      if (response.success) {
        showNotification('success', 'Success', '인센티브 설정이 저장되었습니다');
        setOriginalConfig(config);
        setEditMode(false);
        if (onConfigChange) {
          onConfigChange(config);
        }
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showNotification('error', 'Error', '설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setConfig(originalConfig);
    setEditMode(false);
    setValidationErrors([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            인센티브 설정
            {userName && (
              <Chip 
                label={userName} 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          <Stack direction="row" spacing={1}>
            {canEdit && (
              <>
                {editMode ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={saving}
                      size="small"
                    >
                      저장
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      disabled={saving}
                      size="small"
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditMode(true)}
                    size="small"
                  >
                    수정
                  </Button>
                )}
              </>
            )}
            {editMode && (
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    size="small"
                  />
                }
                label="고급 모드"
              />
            )}
          </Stack>
        </Box>

        {/* Active Status */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={config.isActive}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                disabled={!editMode}
              />
            }
            label={config.isActive ? '활성화됨' : '비활성화됨'}
          />
          {!config.isActive && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              인센티브 계산이 비활성화되어 있습니다
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Incentive Type Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel>인센티브 유형</InputLabel>
          <Select
            value={incentiveTypes.length > 0 && incentiveTypes.find(t => t.value === config.type) ? config.type : ''}
            onChange={(e) => handleTypeChange(e.target.value as IncentiveType)}
            label="인센티브 유형"
            disabled={!editMode}
          >
            {incentiveTypes.length === 0 ? (
              <MenuItem value="" disabled>
                <Typography color="text.secondary">
                  유형을 불러오는 중...
                </Typography>
              </MenuItem>
            ) : (
              incentiveTypes
                .filter(type => advancedMode || type.value !== 'CUSTOM')
                .map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography variant="body1">
                        {INCENTIVE_TYPE_LABELS[type.value] || type.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {INCENTIVE_TYPE_DESCRIPTIONS[type.value] || type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
            )}
          </Select>
        </FormControl>

        {/* Parameters or Custom Formula */}
        {config.type === 'CUSTOM' ? (
          <CustomFormulaEditor
            formula={config.customFormula || ''}
            onChange={handleFormulaChange}
            disabled={!editMode}
            onValidate={validateConfig}
          />
        ) : (
          <ParameterInputs
            type={config.type}
            parameters={config.parameters}
            onChange={handleParametersChange}
            disabled={!editMode}
          />
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Simulation Panel */}
        <SimulationPanel
          config={config}
          userId={userId}
        />
      </CardContent>
    </Card>
  );
};

export default IncentiveConfig;