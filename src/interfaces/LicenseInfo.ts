export interface LicenseInfo {
  repository: {
    licenseInfo: {
      name: string;
      spdxId: string;
      url: string;
      description: string;
    };
    mainLicense: {
      text: string;
    } | null;
    masterLicense: {
      text: string;
    } | null;
  };
}
