/**
 * Domain entities for Organization Bodies
 * See docs/domain/3.organization_bodies.md
 */

export interface Forum {
  forumId: string;
  forumCode: string;
  forumName: string;
  adminUserId: string;
  establishedDate: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date | null;
  updatedBy?: string | null;
}

export interface Area {
  areaId: string;
  forumId: string;
  forum?: Partial<Forum>;
  areaCode: string;
  areaName: string;
  adminUserId: string;
  establishedDate: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date | null;
  updatedBy?: string | null;
}

export interface Unit {
  unitId: string;
  areaId: string;
  area?: Partial<Area>;
  forumId: string;
  forum?: Partial<Forum>;
  unitCode: string;
  unitName: string;
  adminUserId: string;
  establishedDate: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date | null;
  updatedBy?: string | null;
}
