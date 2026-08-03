import api from './client'

export interface GraphNode {
  id: string
  title: string
  tags?: string[]
  x?: number
  y?: number
  z?: number
  has_embedding?: boolean
}

export interface GraphLink {
  source: string
  target: string
  type: 'wikilink' | 'semantic'
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface Brain3DData {
  nodes: GraphNode[]
  ready: boolean
}

export const graphApi = {
  getGraph: () => api.get<GraphData>('/graph/'),
  getBrain3D: () => api.get<Brain3DData>('/graph/brain3d'),
}
