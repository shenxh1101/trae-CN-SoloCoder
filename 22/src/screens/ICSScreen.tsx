import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker, {DocumentPickerResponse} from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {useRoute} from '@react-navigation/native';
import {useTheme} from '@theme';
import {useAppDispatch, useAppSelector} from '@hooks';
import {importEvents, setCategories} from '@store/eventsSlice';
import {exportToICS, importFromICS, validateICS} from '@utils/icsUtils';

type RouteProps = {
  params?: {
    mode?: 'import' | 'export';
  };
};

const ICSScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const {events, categories} = useAppSelector(state => state.events);

  const [mode, setMode] = useState<'import' | 'export'>(route.params?.mode || 'export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    events: number;
    categories: number;
  } | null>(null);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const icsContent = exportToICS(events, categories);
      const path = `${RNFS.DocumentDirectoryPath}/countdown-events.ics`;
      await RNFS.writeFile(path, icsContent, 'utf8');

      await Share.open({
        url: `file://${path}`,
        type: 'text/calendar',
        title: '导出倒计时事件',
        subject: '倒计时事件导出',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('导出失败', error.message || '无法导出ICS文件');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    try {
      const result: DocumentPickerResponse[] = await DocumentPicker.pick({
        type: ['text/calendar', 'application/ics'],
      });

      if (result.length > 0) {
        const fileUri = result[0].uri;
        const content = await RNFS.readFile(fileUri, 'utf8');

        if (!validateICS(content)) {
          Alert.alert('格式错误', '请选择有效的ICS日历文件');
          return;
        }

        setIsProcessing(true);
        const {events: importedEvents, categories: importedCategories} = importFromICS(
          content,
          categories,
        );

        if (importedCategories.length > categories.length) {
          dispatch(setCategories(importedCategories));
        }

        if (importedEvents.length > 0) {
          dispatch(importEvents(importedEvents));
          setImportResult({
            events: importedEvents.length,
            categories: importedCategories.length - categories.length,
          });
        } else {
          Alert.alert('无新事件', '文件中的事件已存在');
        }
      }
    } catch (error: any) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('导入失败', error.message || '无法导入ICS文件');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderExportMode = () => (
    <View>
      <View style={[styles.statsSection, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          导出内容
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.primary}]}>
              {events.length}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
              个事件
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {color: theme.colors.secondary}]}>
              {categories.length}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
              个分类
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.infoTitle, {color: theme.colors.text}]}>
          📅 导出说明
        </Text>
        <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
          • 导出的ICS文件包含所有倒计时事件{'\n'}
          • 可导入到系统日历或其他日历应用{'\n'}
          • 包含事件名称、日期、分类、重复规则等信息{'\n'}
          • 支持与Google日历、Apple日历等同步
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.exportButton,
          {backgroundColor: theme.colors.primary},
          isProcessing && {opacity: 0.7},
        ]}
        onPress={handleExport}
        disabled={isProcessing}>
        {isProcessing ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.exportButtonText}>  导出中...</Text>
          </View>
        ) : (
          <Text style={styles.exportButtonText}>📤 导出ICS文件</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderImportMode = () => (
    <View>
      {importResult && (
        <View
          style={[
            styles.resultSection,
            {backgroundColor: 'rgba(16,185,129,0.1)'},
          ]}>
          <Text style={[styles.resultTitle, {color: theme.colors.success}]}>
            ✓ 导入成功
          </Text>
          <Text style={[styles.resultText, {color: theme.colors.text}]}>
            成功导入 {importResult.events} 个事件
            {importResult.categories > 0 &&
              `，新增 ${importResult.categories} 个分类`}
          </Text>
        </View>
      )}

      <View style={[styles.infoSection, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.infoTitle, {color: theme.colors.text}]}>
          📥 导入说明
        </Text>
        <Text style={[styles.infoText, {color: theme.colors.textSecondary}]}>
          • 支持导入标准ICS格式的日历文件{'\n'}
          • 可从系统日历或其他应用导出ICS文件{'\n'}
          • 会自动识别事件名称、日期、重复规则{'\n'}
          • 已存在的事件不会重复导入{'\n'}
          • 新分类会自动创建
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.importButton,
          {backgroundColor: theme.colors.primary},
          isProcessing && {opacity: 0.7},
        ]}
        onPress={handleImport}
        disabled={isProcessing}>
        {isProcessing ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.importButtonText}>  导入中...</Text>
          </View>
        ) : (
          <Text style={styles.importButtonText}>📁 选择ICS文件</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            {mode === 'export' ? '导出日历' : '导入日历'}
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            {mode === 'export'
              ? '导出倒计时事件为ICS格式'
              : '从ICS文件导入倒计时事件'}
          </Text>
        </View>

        <View style={[styles.modeToggle, {backgroundColor: theme.colors.surface}]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'export' && [
                styles.activeModeButton,
                {backgroundColor: theme.colors.primary},
              ],
            ]}
            onPress={() => {
              setMode('export');
              setImportResult(null);
            }}>
            <Text
              style={{
                color: mode === 'export' ? '#FFFFFF' : theme.colors.text,
              }}>
              📤 导出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'import' && [
                styles.activeModeButton,
                {backgroundColor: theme.colors.primary},
              ],
            ]}
            onPress={() => {
              setMode('import');
              setImportResult(null);
            }}>
            <Text
              style={{
                color: mode === 'import' ? '#FFFFFF' : theme.colors.text,
              }}>
              📥 导入
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'export' ? renderExportMode() : renderImportMode()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {},
  statsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  infoSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
  },
  exportButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
  },
});

export default ICSScreen;
