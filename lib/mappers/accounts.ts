import { MunicipalityDTO } from '../types/dtos';
import { MunicipalityEntity } from '../types/entities';
import { AccountStatus, Region } from '../types/enums';

export const mapMunicipalityToDTO = (row: any): MunicipalityDTO => {
  return {
    id: row.id,
    name: row.name || '-',
    mayor_name: row.mayor_name || undefined,
    city: row.city || '-',
    state: row.state || '-',
    zip_code: row.zip_code || undefined,
    address: row.address || undefined,
    ddd: row.ddd || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    email: row.email || undefined,
    website: row.website || undefined,
    population: row.population || 0,
    region: row.region as Region || undefined,
    area_km2: row.area_km2 || 0,
    installation_year: row.installation_year || undefined,
    population_range: row.population_range || undefined,
    status: row.status as AccountStatus || AccountStatus.PROSPECT,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};
