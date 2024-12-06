import { useUserData } from '@/configs/userData.config'
import Dropzone from 'dropzone'
import { ref } from 'vue'
export const uploadFiles = ref<Dropzone.DropzoneFile[]>([])

export function useUploadFiles(
  container: string | HTMLElement,
  args: any,
  callback: (...args: any) => void,
) {
  const myDropzone = new Dropzone(
    container as HTMLElement,
    {
      paramName: 'files',
      url: `${import.meta.env.VITE_BACKEND_URL}api/v1/common/upload-files`,
      chunking: true,
      maxFilesize: 400000000,
      chunkSize: 1000000,
      headers: {
        authorization: 'Bearer ' + btoa(useUserData() as string),
      },
      method: 'POST',
      disablePreviews: true,
    } as Dropzone.DropzoneOptions,
  )
  myDropzone.on('thumbnail', function (file: Dropzone.DropzoneFile, dataURL) {
    console.log(file)
    uploadFiles.value.push(file)
  })
  myDropzone.on('addedfile', (file: Dropzone.DropzoneFile) => {})
  myDropzone.on('success', (file: Dropzone.DropzoneFile, _response) => {
    uploadFiles.value = uploadFiles.value?.filter(
      (item: Dropzone.DropzoneFile) => item.upload?.uuid !== file.upload?.uuid,
    )
    callback(...args, _response.data)
  })
  myDropzone.on('uploadprogress', (file, progress) => {
    console.log(progress)
  })
}
