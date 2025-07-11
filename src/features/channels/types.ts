export interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string | null;
  parentId?: string | null;
  guildName?: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
} 