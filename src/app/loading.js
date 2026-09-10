import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import LoadingScreen from '@/components/LoadingScreen';

// Server component: fetch company data, render client component
export default async function Loading() {
  let companyName = 'Merchandising Management System';
  let companyLogo = '';

  try {
    await dbConnect();
    const company = await Company.findOne().select('name logo').lean();
    if (company?.name) companyName = company.name;
    if (company?.logo) companyLogo = company.logo;
  } catch {
    // fail silently — use defaults
  }

  return <LoadingScreen companyName={companyName} companyLogo={companyLogo} />;
}
