// Domain: System Configuration Repository Interface

import { SystemConfiguration } from './entities';

export interface SystemConfigurationRepository {
  findByKey(key: string, tx?: any): Promise<SystemConfiguration | null>;
  
  findAll(tx?: any): Promise<SystemConfiguration[]>;
  
  upsert(
    data: {
      key: string;
      value: string;
      description?: string | null;
      dataType?: string;
      updatedBy?: string | null;
    },
    tx?: any
  ): Promise<SystemConfiguration>;
  
  update(
    key: string,
    data: {
      value: string;
      updatedBy?: string | null;
    },
    tx?: any
  ): Promise<SystemConfiguration>;
}
