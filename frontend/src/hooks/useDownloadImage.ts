import { Node } from '@xyflow/react'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

// Create a utility function for downloading the image
const downloadImage = (dataUrl: string): void => {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'reactflow.png'
  a.click()
}

export const useDownloadImage = () => {
  const handleDownloadImage = (): void => {
    // Get the ReactFlow instance
    const flow = document.querySelector('.react-flow') as HTMLElement
    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!flow || !viewportEl) {
      console.error('Unable to locate the flow canvas elements!')
      return
    }

    // Get the flow dimensions
    const flowBounds = flow.getBoundingClientRect()
    const imageWidth = flowBounds.width
    const imageHeight = flowBounds.height

    // Get all nodes from the DOM to calculate bounds
    const nodeElements = document.querySelectorAll('.react-flow__node')
    const nodes = Array.from(nodeElements).map(el => {
      const bounds = el.getBoundingClientRect()
      return {
        id: el.getAttribute('data-id') || '',
        position: {
          x: bounds.x - flowBounds.x,
          y: bounds.y - flowBounds.y
        },
        width: bounds.width,
        height: bounds.height,
        data: {},
        type: 'default'
      } as Node
    })

    // Calculate the bounds and viewport transform
    const nodesBounds = getNodesBounds(nodes)
    const transform = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0 // Adding the missing padding parameter
    )

    // Generate the image with the calculated transform
    toPng(viewportEl, {
      backgroundColor: '#1a365d',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
      },
    })
      .then(downloadImage)
      .catch((err) => {
        console.error('Failed to download image', err)
      })
  }

  return { handleDownloadImage }
}