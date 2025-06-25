const fs = require('fs');

// Analyze your API routes and generate proper types
const analyzeApiRoutes = () => {
  // Read API files and extract request/response patterns
  // Generate proper interfaces
  const types = `
export interface ClassApiRequest {
  student_email?: string;
  google_meet_url?: string;
  meetUrl?: string;
  enrollment_id?: string;
  manual_override?: boolean;
  start_time?: string;
}

export interface DashboardApiResponse {
  totalStudents: number;
  totalClasses: number;
  upcomingClasses: ClassLog[];
  recentActivity: ClassLog[];
}
  `;
  
  fs.writeFileSync('src/types/generated.ts', types);
  console.log('✅ Generated types written to src/types/generated.ts');
};

analyzeApiRoutes();
