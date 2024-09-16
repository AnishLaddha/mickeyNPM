export interface LicenseInfo {
  repository: {
    licenseInfo: {
      name: string;
      spdxId: string;
      url: string;
      description: string;
    };
    mainpackage: {
      json: any;
    } | null;
    masterpackage: {
      json: any;
    } | null;
  };
}
