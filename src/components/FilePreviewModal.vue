
<script setup>
import { ref, watch, onUnmounted, defineProps, defineEmits } from 'vue'

// Props 定義
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: null
  },
  fetchFileContent: {
    type: Function,
    required: true
  },
  downloadFile: {
    type: Function,
    required: true
  }
})

// Emits 定義
const emit = defineEmits(['close', 'download', 'load-success', 'load-error'])

// 響應式變數
const previewUrl = ref('')
const previewType = ref('')
const loading = ref(false)
const error = ref(false)

// 支援的檔案類型
const supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const supportedVideoTypes = ['mp4', 'webm', 'ogg', 'mov', 'avi']
const supportedDocTypes = ['pdf']

// 獲取檔案副檔名
const getFileExtension = (fileName) => {
  if (!fileName) return ''
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// 判斷檔案預覽類型
const getPreviewType = (fileName) => {
  const extension = getFileExtension(fileName)
  
  if (supportedImageTypes.includes(extension)) {
    return 'image'
  } else if (supportedVideoTypes.includes(extension)) {
    return 'video'
  } else if (supportedDocTypes.includes(extension)) {
    return 'pdf'
  } else {
    return 'unsupported'
  }
}

// 獲取檔案的 MIME 類型
const getContentType = (fileName) => {
  const extension = getFileExtension(fileName)
  const mimeTypes = {
    // 圖片
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    
    // 影片
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    
    // 文檔
    'pdf': 'application/pdf'
  }
  
  return mimeTypes[extension] || 'application/octet-stream'
}

// 載入檔案內容
const loadFileContent = async () => {
  if (!props.file) return
  
  try {
    loading.value = true
    error.value = false
    previewType.value = getPreviewType(props.file.file_name)
    
    // 如果是不支援的檔案類型，直接顯示不支援訊息
    if (previewType.value === 'unsupported') {
      loading.value = false
      return
    }
    const id = props.file.file_id || props.file.id
    console.log(id);
    
    // 調用父組件傳入的檔案獲取函數
    const response = await props.fetchFileContent(id)
    
    if (response?.status === 400) {
      error.value = true
      loading.value = false
      emit('load-error', response)
      return
    }
    
    // 創建 Blob URL 用於預覽
    const blob = new Blob([response], { 
      type: getContentType(props.file.file_name) 
    })
    previewUrl.value = URL.createObjectURL(blob)
    loading.value = false
    emit('load-success', blob)
    
  } catch (err) {
    console.error('預覽檔案時發生錯誤:', err)
    error.value = true
    loading.value = false
    emit('load-error', err)
  }
}

// 清理預覽 URL
const cleanup = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  previewType.value = ''
  error.value = false
  loading.value = false
}

// 關閉預覽
const handleClose = () => {
  cleanup()
  emit('close')
}

// 下載檔案
const handleDownload = async () => {
  if (props.file && props.downloadFile) {
    await props.downloadFile(props.file)
    emit('download', props.file)
  }
}

// 圖片載入完成
const onImageLoad = () => {
  console.log('圖片載入完成')
}

// 影片載入完成
const onVideoLoad = () => {
  console.log('影片載入完成')
}

// 預覽載入錯誤
const onPreviewError = () => {
  console.error('預覽載入失敗')
  error.value = true
}

// 監聽 visible 變化
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.file) {
    loadFileContent()
  } else if (!newVisible) {
    cleanup()
  }
})

// 監聽 file 變化
watch(() => props.file, (newFile) => {
  if (props.visible && newFile) {
    loadFileContent()
  }
})

// 組件卸載時清理
onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div v-if="visible" class="file-preview-modal" @click="handleClose">
    <div class="file-preview-content" @click.stop>
      <div class="file-preview-header">
        <h3 class="preview-title">{{ file?.file_name || '檔案預覽' }}</h3>
        <div class="preview-actions">
          <button @click="handleDownload" class="preview-download-btn" title="下載檔案">
            <span>⬇</span>
          </button>
          <button @click="handleClose" class="preview-close-btn" title="關閉">
            <span>✕</span>
          </button>
        </div>
      </div>
      
      <div class="file-preview-body">
        <!-- 載入中狀態 -->
        <div v-if="loading" class="preview-loading">
          <div class="loading-spinner">⟳</div>
          <div>載入中...</div>
        </div>
        
        <!-- 圖片預覽 -->
        <div v-else-if="previewType === 'image'" class="image-preview">
          <img 
            :src="previewUrl" 
            :alt="file?.file_name" 
            @load="onImageLoad" 
            @error="onPreviewError" 
          />
        </div>
        
        <!-- PDF 預覽 -->
        <div v-else-if="previewType === 'pdf'" class="pdf-preview">
          <iframe :src="previewUrl" frameborder="0"></iframe>
        </div>
        
        <!-- 影片預覽 -->
        <div v-else-if="previewType === 'video'" class="video-preview">
          <video 
            :src="previewUrl" 
            controls 
            @loadeddata="onVideoLoad" 
            @error="onPreviewError"
          >
            您的瀏覽器不支援影片播放
          </video>
        </div>
        
        <!-- 不支援的檔案類型 -->
        <div v-else-if="previewType === 'unsupported'" class="unsupported-preview">
          <div class="unsupported-icon">📄</div>
          <div class="unsupported-title">無法預覽此檔案</div>
          <div class="unsupported-description">
            不支援 {{ getFileExtension(file?.file_name) }} 格式的預覽，請下載檔案查看
          </div>
          <button @click="handleDownload" class="download-instead-btn">
            下載檔案
          </button>
        </div>
        
        <!-- 錯誤狀態 -->
        <div v-else-if="error" class="preview-error">
          <div class="error-icon">⚠️</div>
          <div class="error-title">預覽失敗</div>
          <div class="error-description">無法載入檔案內容</div>
          <button @click="handleDownload" class="download-instead-btn">
            嘗試下載
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// 檔案預覽彈窗樣式
.file-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.file-preview-content {
  background: white;
  border-radius: 12px;
  width: 90vw;
  height: 90vh;
  max-width: 1600px;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.file-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8f9fa;

  .preview-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    word-break: break-all;
    flex: 1;
    margin-right: 20px;
  }

  .preview-actions {
    display: flex;
    gap: 10px;
  }

  .preview-download-btn,
  .preview-close-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 16px;
  }

  .preview-download-btn {
    background: #6c5ce7;
    color: white;

    &:hover {
      background: #5b4bcf;
    }
  }

  .preview-close-btn {
    background: #e74c3c;
    color: white;

    &:hover {
      background: #c0392b;
    }
  }
}

.file-preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f8f9fa;
  position: relative;
}

// 載入狀態
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;

  .loading-spinner {
    font-size: 32px;
    animation: spin 1s linear infinite;
  }
}

// 圖片預覽
.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;

  img {
    max-width: 90%; /* 更保守的尺寸限制 */
    max-height: 90%;
    width: auto;
    height: auto;
    object-fit: contain;


  }
}

// PDF 預覽
.pdf-preview {
  width: 100%;
  height: 100%;

  iframe {
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }
}

// 影片預覽
.video-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  video {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
}

// 不支援的檔案類型
.unsupported-preview,
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  color: #666;
  text-align: center;
  max-width: 400px;

  .unsupported-icon,
  .error-icon {
    font-size: 64px;
    opacity: 0.6;
  }

  .unsupported-title,
  .error-title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
  }

  .unsupported-description,
  .error-description {
    font-size: 14px;
    line-height: 1.6;
    color: #666;
  }

  .download-instead-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #5b4bcf;
      transform: translateY(-1px);
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .file-preview-content {
    width: 95vw;
    height: 95vh;
  }

  .file-preview-header {
    padding: 15px 20px;

    .preview-title {
      font-size: 14px;
    }

    .preview-download-btn,
    .preview-close-btn {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }
  }

  .file-preview-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0; // 移除 body 的 padding，讓圖片預覽自己處理
    background: #f8f9fa;
    position: relative;
    overflow: hidden; // 防止內容溢出

  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>