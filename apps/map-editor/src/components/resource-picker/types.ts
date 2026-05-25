// apps/map-editor/src/components/resource-picker/types.ts

export type ResourceType = 'image' | 'model'

export interface ResourcePickerProps {
  type: ResourceType
  modelValue?: string
  disabled?: boolean
  acceptTypes?: string[]
  /**
   * 是否立即将选择的资源添加到 store
   * 默认 true。对于编辑模式，应该设置为 false，只在表单提交时才保存
   */
  autoSave?: boolean
  /**
   * 是否隐藏内置预览组件
   * 默认 false。当外层已有预览面板时设为 true
   */
  hidePreview?: boolean
}

export interface ResourcePickerEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', resource: ResourceInfo): void
}

export interface ResourcePickerOptions {
  type: ResourceType
  initialId?: string
  resourceName?: string
  onBeforeSelect?: () => Promise<boolean>
  onSelect?: (resource: ResourceInfo) => void
  /**
   * 是否立即将选择的资源添加到 store
   * 默认 true。对于编辑模式，应该设置为 false，只在表单提交时才保存
   */
  autoSave?: boolean
}

export interface ResourceInfo {
  id: string
  name: string
  fileType: string
  url: string
}

export interface ResourcePickerError {
  code: 'FILE_SELECT_CANCELLED' | 'FILE_READ_FAILED' | 'RESOURCE_SAVE_FAILED' | 'INVALID_FILE_TYPE'
  message: string
  details?: unknown
}
