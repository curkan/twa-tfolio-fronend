<script setup lang="ts">
import {
  GridStack,
  type GridItemHTMLElement,
  type GridStackElement,
  type GridStackNode,
  type GridStackWidget,
} from 'gridstack'
import { ref, onMounted, nextTick, reactive, watch } from 'vue'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import { useWebAppHapticFeedback } from 'vue-tg'
import IconPlus from './icons/IconPlus.vue'
import IconRemove from './icons/IconRemove.vue'
import { showImagePreview, showLoadingToast } from 'vant'
import { useHandleDoubleTap } from '@/composables/handles/useHandleDoubleTap'
import { useHandleUploadImage } from '@/composables/handles/useHandleUploadImage'
import {useAuth} from '@/composables/auth/auth'
import type {Node} from '@/composables/types/grid.type'
import {gridData, useGetGridData} from '@/composables/grid/useGetGridData'
import {useUpdateGrid} from '@/composables/grid/useUpdateGrid'

const fileInput = ref<HTMLInputElement>()
const nodes = ref<Node[]>()
const gridFirstLoaded = ref<boolean>(false)

// DO NOT use ref(null) as proxies GS will break all logic when comparing structures... see https://github.com/gridstack/gridstack.js/issues/2115
let grid: GridStack | null = null

let items = ref<GridStackWidget[]>([])
const visibleRemove = ref(false)

window.Telegram.WebApp.setHeaderColor('#212121')
window.Telegram.WebApp.setBackgroundColor('#212121')
window.Telegram.WebApp.setBottomBarColor('#212121')
window.Telegram.WebApp.setBottomBarColor('#212121')
window.Telegram.WebApp.expand()

if (window.Telegram.WebApp.isVersionAtLeast('8.0')) {
  window.Telegram.WebApp.requestFullscreen()
}


onMounted(async () => {
  useAuth()

  await useGetGridData();

  watch(
    () => gridData.value,
    () => {
      grid?.removeAll()

      nodes.value = gridData.value?.grid
      nodes.value?.forEach((node: Node) => {
        node.internalId = node.id
        node.id = 'w_' + node.sort
        console.log(node)
        items.value.push(node as GridStackWidget)

        nextTick(() => {
          grid?.makeWidget(node.id as GridStackElement)
        })
      })

      nextTick(() => {
        gridFirstLoaded.value = true
      })
    }
  )

  grid = GridStack.init({
    float: false,
    column: 4,
  })

  grid.on('change', onChange)
  grid.on('removed', onChange)

  grid.on('resizestart', function (event: Event, el: GridItemHTMLElement) {
    removeVisibleIcon()
  })

  grid.on('dragstart', function (event: Event, el: GridItemHTMLElement) {
    removeVisibleIcon()
    if (el.gridstackNode) {
      let node: GridStackNode = el.gridstackNode
    }
    grid?.enableMove(false)

    useWebAppHapticFeedback().impactOccurred('light')
  })

  grid.on('dragstop', function (event: Event, el: GridItemHTMLElement) {
    grid?.enableMove(true)
    useWebAppHapticFeedback().selectionChanged()
  })
})

const openImagePreview = (link: string, startPosition: number) => {
  showImagePreview({
    images: gridData.value?.grid.map(a => a.image.original),
    closeOnClickOverlay: true,
    startPosition: startPosition ?? 1,
    closeable: true,
  })
}

const removeVisibleIcon = () => {
  visibleRemove.value = false
  var elements = Array.from(document.getElementsByClassName('grid-stack-item'))
  elements.forEach(function (element) {
    element.classList.remove('ui-remove-visible')
  })
}

const onChange = (event: Event, changeItems: any) => {
  if (gridFirstLoaded.value === false) return

  changeItems.forEach((item: any) => {
    const widget = items.value.find((w: GridStackWidget) => w.id === item.id)

    if (!widget) return

    const updatedWidget = widget as GridStackWidget
    updatedWidget.x = item.x
    updatedWidget.y = item.y
    updatedWidget.w = item.w
    updatedWidget.h = item.h
  })

  const gridStackItems = document.querySelectorAll('.grid-stack .grid-stack-item');
  const newData = Array.from(gridStackItems).map((el) => {
    return {
      id: el.getAttribute('internal-id'),
      sort: el.getAttribute('id'),
      x: el.getAttribute('gs-x'),
      y: el.getAttribute('gs-y'),
      w: el.getAttribute('gs-w') ?? 1,
      h: el.getAttribute('gs-h') ?? 1
    };
  });

  useUpdateGrid(newData)
}

const handleTouch = (e: Event) => {
  if ((e.target as HTMLElement).classList.contains('ui-resizable-handle')) {
    return
  }

  let target = e.target as HTMLElement
  removeVisibleIcon()

  target.closest('.grid-stack-item')?.classList.add('ui-remove-visible')
  visibleRemove.value = !visibleRemove.value
}

const triggerFileInput = () => {
  fileInput?.value?.click()
}

const addNewWidget = (newNode: Node) => {
  const node = newNode

  node.internalId = node.id
  node.id = 'w_' + newNode.id
  items.value.push(node as GridStackWidget)

  nextTick(() => {
    grid?.makeWidget(node.id as GridStackElement)
  })
}

const remove = (widget: GridStackWidget) => {
  const selector = `#${widget.id}`
  grid?.removeWidget(selector, true)
}
</script>

<template>
  <button class="add-new-widget" type="button" @click="triggerFileInput">
    <IconPlus />
    <label style="display: none">
      <input
        id="newImage"
        type="file"
        name="newImage"
        accept=".png, .jpg, .webp, .jpeg"
        ref="fileInput"
        @change="useHandleUploadImage($event, [], addNewWidget)"
      />
    </label>
  </button>

  <div class="grid-stack">
    <div
      v-for="(w, index) in items"
      @click="handleTouch"
      @touchstart="handleTouch"
      class="grid-stack-item"
      :gs-x="w.x"
      :gs-y="w.y"
      :gs-w="w.w"
      :gs-h="w.h"
      :gs-id="w.internalId"
      :internal-id="w.internalId"
      :id="w.id"
      :key="w.id"
    >
      <div class="grid-stack-item-content">
        <div class="img">
            <img
              v-lazy="{ src: w?.image?.sm, delay: 300 }"
              @click="useHandleDoubleTap(index, [w.image.sm, index], openImagePreview)"
            />
        </div>
        <button v-if="visibleRemove" class="ui-remove" @click="remove(w)"><IconRemove /></button>
      </div>
    </div>
  </div>
</template>

<style></style>
<style scoped lang="scss">
@use '@/assets/scss/grid.scss';
</style>
