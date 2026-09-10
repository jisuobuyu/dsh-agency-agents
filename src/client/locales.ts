/**
 * Agency 客户端词条字典。zh 为 key 集真相源；en 用 satisfies 校验 key 与 zh
 * 完全一致（缺 key 或多余 key 均为编译错误）。模板占位符使用平台约定的
 * {word} 形式（locale 服务 translate 以 /\{(\w+)\}/g 替换）。
 */
import { EN_DIVISION, ZH_DIVISION } from '../names.js'
import { customEn, customZh } from './custom-locales.js'

/** 简体中文词条（key 集真相源）。 */
export const zh = {
  ...customZh,
  'settings.nav': '专家',
  'settings.title': '专家',
  'settings.loading': '正在加载专家…',
  'settings.viewProject': 'GitHub',
  'settings.feedback': '问题反馈',
  'settings.enabled': '已启用',
  'settings.disabled': '已停用',
  'settings.filter.category': '分类',
  'settings.filter.status': '状态',
  'settings.filter.allStatuses': '全部状态',
  'settings.filter.all': '全部',
  'settings.filter.option': '{name}（{count}）',
  'settings.search': '搜索',
  'settings.search.placeholder': '搜索专家、职责或领域',
  'settings.search.clear': '清除搜索',
  'settings.viewPrompt': '查看提示词',
  'settings.copyPrompt': '复制提示词',
  'settings.copySuccess': '已复制',
  'settings.promptTitle': '{name} 的提示词',
  'settings.promptClose': '关闭',
  'settings.promptLoading': '正在读取提示词…',
  'error.promptCopy': '无法复制提示词，请检查浏览器剪贴板权限。',
  'settings.empty': '没有匹配的专家。试试其他关键词，或切换到「{all}」。',
  'settings.empty.reset': '清除筛选',
  'error.conflict': '配置已被其他窗口修改。',
  'error.conflict.refreshed': '配置已被其他窗口修改，已为您刷新。',
  'error.conflict.refreshFailed': '配置已被其他窗口修改，但刷新失败，请手动刷新。',
  'error.insertFailed': '未能插入专家标签，请重试。',
  'btn.refresh': '刷新',
  'summary.total.one': '位专家',
  'summary.total.other': '位专家',
  'summary.enabledPrefix': '已启用',
  'button.title': '召唤专家',
  'menu.empty': '暂无可召唤的专家。请先在设置里启用。',
  'division.engineering': ZH_DIVISION.engineering,
  'division.security': ZH_DIVISION.security,
  'division.testing': ZH_DIVISION.testing,
} satisfies Record<string, string>

/** agency 命名空间词条 key 联合。 */
export type AgencyKey = keyof typeof zh

/** 英文词条，key 完整性由 satisfies 在编译期保证。 */
export const en = {
  ...customEn,
  'settings.nav': 'Experts',
  'settings.title': 'Experts',
  'settings.loading': 'Loading experts…',
  'settings.viewProject': 'GitHub',
  'settings.feedback': 'Issues',
  'settings.enabled': 'Enabled',
  'settings.disabled': 'Disabled',
  'settings.filter.category': 'Category',
  'settings.filter.status': 'Status',
  'settings.filter.allStatuses': 'All statuses',
  'settings.filter.all': 'All',
  'settings.filter.option': '{name} ({count})',
  'settings.search': 'Search',
  'settings.search.placeholder': 'Search experts, roles, or domains',
  'settings.search.clear': 'Clear search',
  'settings.viewPrompt': 'View prompt',
  'settings.copyPrompt': 'Copy prompt',
  'settings.copySuccess': 'Copied',
  'settings.promptTitle': 'Prompt for {name}',
  'settings.promptClose': 'Close',
  'settings.promptLoading': 'Loading prompt…',
  'error.promptCopy': 'Could not copy the prompt. Check browser clipboard permissions.',
  'settings.empty': 'No matching experts. Try another keyword, or switch to {all}.',
  'settings.empty.reset': 'Clear filters',
  'error.conflict': 'Settings were changed in another window.',
  'error.conflict.refreshed': 'Settings were changed in another window and have been refreshed.',
  'error.conflict.refreshFailed': 'Settings were changed in another window, but refresh failed. Please refresh manually.',
  'error.insertFailed': 'The expert reference could not be inserted. Please try again.',
  'btn.refresh': 'Refresh',
  'summary.total.one': 'expert',
  'summary.total.other': 'experts',
  'summary.enabledPrefix': 'Enabled',
  'button.title': 'Summon expert',
  'menu.empty': 'No experts available yet. Enable some in Settings first.',
  'division.engineering': EN_DIVISION.engineering,
  'division.security': EN_DIVISION.security,
  'division.testing': EN_DIVISION.testing,
} satisfies Record<AgencyKey, string>