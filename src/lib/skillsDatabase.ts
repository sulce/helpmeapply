export interface SkillSuggestion {
  name: string
  category: string
  aliases: string[]
  level: 'entry' | 'mid' | 'senior' | 'expert'
  relatedSkills: string[]
}

export const SKILLS_DATABASE: SkillSuggestion[] = [
  // Programming Languages
  { name: 'JavaScript', category: 'Programming Languages', aliases: ['JS', 'Javascript', 'ECMAScript'], level: 'entry', relatedSkills: ['TypeScript', 'Node.js', 'React'] },
  { name: 'TypeScript', category: 'Programming Languages', aliases: ['TS'], level: 'mid', relatedSkills: ['JavaScript', 'Angular', 'React'] },
  { name: 'Python', category: 'Programming Languages', aliases: ['Python3'], level: 'entry', relatedSkills: ['Django', 'Flask', 'NumPy'] },
  { name: 'Java', category: 'Programming Languages', aliases: ['Java SE', 'Java EE'], level: 'entry', relatedSkills: ['Spring', 'Maven', 'Gradle'] },
  { name: 'C#', category: 'Programming Languages', aliases: ['C Sharp', 'CSharp'], level: 'mid', relatedSkills: ['.NET', 'ASP.NET', 'Entity Framework'] },
  { name: 'Go', category: 'Programming Languages', aliases: ['Golang'], level: 'mid', relatedSkills: ['Docker', 'Kubernetes', 'gRPC'] },
  { name: 'Rust', category: 'Programming Languages', aliases: [], level: 'senior', relatedSkills: ['WebAssembly', 'Cargo'] },
  { name: 'PHP', category: 'Programming Languages', aliases: ['PHP7', 'PHP8'], level: 'entry', relatedSkills: ['Laravel', 'Symfony', 'WordPress'] },
  { name: 'Ruby', category: 'Programming Languages', aliases: [], level: 'mid', relatedSkills: ['Ruby on Rails', 'Sinatra'] },
  { name: 'Swift', category: 'Programming Languages', aliases: [], level: 'mid', relatedSkills: ['iOS Development', 'Xcode', 'SwiftUI'] },
  { name: 'Kotlin', category: 'Programming Languages', aliases: [], level: 'mid', relatedSkills: ['Android Development', 'Spring Boot'] },

  // Frontend Frameworks & Libraries
  { name: 'React', category: 'Frontend Frameworks', aliases: ['React.js', 'ReactJS'], level: 'entry', relatedSkills: ['JSX', 'Redux', 'Next.js'] },
  { name: 'Vue.js', category: 'Frontend Frameworks', aliases: ['Vue', 'VueJS'], level: 'entry', relatedSkills: ['Vuex', 'Nuxt.js'] },
  { name: 'Angular', category: 'Frontend Frameworks', aliases: ['AngularJS', 'Angular 2+'], level: 'mid', relatedSkills: ['TypeScript', 'RxJS', 'NgRx'] },
  { name: 'Svelte', category: 'Frontend Frameworks', aliases: ['SvelteKit'], level: 'mid', relatedSkills: ['SvelteKit', 'Vite'] },
  { name: 'Next.js', category: 'Frontend Frameworks', aliases: ['NextJS'], level: 'mid', relatedSkills: ['React', 'Vercel', 'SSR'] },
  { name: 'Nuxt.js', category: 'Frontend Frameworks', aliases: ['NuxtJS'], level: 'mid', relatedSkills: ['Vue.js', 'SSR'] },

  // Backend Frameworks
  { name: 'Node.js', category: 'Backend Frameworks', aliases: ['NodeJS'], level: 'entry', relatedSkills: ['Express.js', 'npm', 'REST APIs'] },
  { name: 'Express.js', category: 'Backend Frameworks', aliases: ['Express', 'ExpressJS'], level: 'entry', relatedSkills: ['Node.js', 'REST APIs'] },
  { name: 'Django', category: 'Backend Frameworks', aliases: [], level: 'mid', relatedSkills: ['Python', 'PostgreSQL', 'Django REST Framework'] },
  { name: 'Flask', category: 'Backend Frameworks', aliases: [], level: 'entry', relatedSkills: ['Python', 'SQLAlchemy'] },
  { name: 'Spring Boot', category: 'Backend Frameworks', aliases: ['Spring'], level: 'mid', relatedSkills: ['Java', 'Maven', 'JPA'] },
  { name: 'Laravel', category: 'Backend Frameworks', aliases: [], level: 'mid', relatedSkills: ['PHP', 'Eloquent ORM', 'Artisan'] },
  { name: 'Ruby on Rails', category: 'Backend Frameworks', aliases: ['Rails'], level: 'mid', relatedSkills: ['Ruby', 'ActiveRecord'] },
  { name: 'FastAPI', category: 'Backend Frameworks', aliases: [], level: 'mid', relatedSkills: ['Python', 'Pydantic', 'async/await'] },

  // Databases
  { name: 'PostgreSQL', category: 'Databases', aliases: ['Postgres'], level: 'entry', relatedSkills: ['SQL', 'PL/pgSQL'] },
  { name: 'MySQL', category: 'Databases', aliases: [], level: 'entry', relatedSkills: ['SQL', 'phpMyAdmin'] },
  { name: 'MongoDB', category: 'Databases', aliases: ['Mongo'], level: 'entry', relatedSkills: ['NoSQL', 'Mongoose'] },
  { name: 'Redis', category: 'Databases', aliases: [], level: 'mid', relatedSkills: ['Caching', 'Pub/Sub'] },
  { name: 'SQLite', category: 'Databases', aliases: [], level: 'entry', relatedSkills: ['SQL', 'Embedded databases'] },
  { name: 'DynamoDB', category: 'Databases', aliases: [], level: 'mid', relatedSkills: ['AWS', 'NoSQL'] },
  { name: 'Elasticsearch', category: 'Databases', aliases: ['Elastic Search'], level: 'senior', relatedSkills: ['Search', 'Kibana', 'Logstash'] },

  // Cloud & DevOps
  { name: 'AWS', category: 'Cloud Platforms', aliases: ['Amazon Web Services'], level: 'mid', relatedSkills: ['EC2', 'S3', 'Lambda'] },
  { name: 'Google Cloud Platform', category: 'Cloud Platforms', aliases: ['GCP'], level: 'mid', relatedSkills: ['Compute Engine', 'Cloud Storage'] },
  { name: 'Azure', category: 'Cloud Platforms', aliases: ['Microsoft Azure'], level: 'mid', relatedSkills: ['Azure Functions', 'Blob Storage'] },
  { name: 'Docker', category: 'DevOps', aliases: [], level: 'mid', relatedSkills: ['Containers', 'Kubernetes', 'Docker Compose'] },
  { name: 'Kubernetes', category: 'DevOps', aliases: ['K8s'], level: 'senior', relatedSkills: ['Docker', 'Helm', 'kubectl'] },
  { name: 'Terraform', category: 'DevOps', aliases: [], level: 'senior', relatedSkills: ['Infrastructure as Code', 'AWS', 'HCL'] },
  { name: 'Jenkins', category: 'DevOps', aliases: [], level: 'mid', relatedSkills: ['CI/CD', 'Pipeline', 'Groovy'] },
  { name: 'GitHub Actions', category: 'DevOps', aliases: [], level: 'mid', relatedSkills: ['CI/CD', 'YAML', 'Workflows'] },

  // Tools & Technologies
  { name: 'Git', category: 'Version Control', aliases: [], level: 'entry', relatedSkills: ['GitHub', 'GitLab', 'Branching'] },
  { name: 'GitHub', category: 'Version Control', aliases: [], level: 'entry', relatedSkills: ['Git', 'Pull Requests', 'Actions'] },
  { name: 'VS Code', category: 'IDEs', aliases: ['Visual Studio Code'], level: 'entry', relatedSkills: ['Extensions', 'Debugging'] },
  { name: 'IntelliJ IDEA', category: 'IDEs', aliases: [], level: 'mid', relatedSkills: ['Java', 'Refactoring'] },
  { name: 'Postman', category: 'API Testing', aliases: [], level: 'entry', relatedSkills: ['REST APIs', 'API Documentation'] },

  // Data & Analytics
  { name: 'Data Engineering', category: 'Data & Analytics', aliases: ['Data Pipeline'], level: 'mid', relatedSkills: ['Python', 'SQL', 'ETL'] },
  { name: 'Machine Learning & AI', category: 'Data & Analytics', aliases: ['ML', 'AI', 'Artificial Intelligence'], level: 'senior', relatedSkills: ['Python', 'TensorFlow', 'PyTorch'] },
  { name: 'Data Analysis', category: 'Data & Analytics', aliases: ['Data Analytics'], level: 'mid', relatedSkills: ['Excel', 'SQL', 'Python'] },
  { name: 'Business Intelligence', category: 'Data & Analytics', aliases: ['BI'], level: 'mid', relatedSkills: ['Tableau', 'Power BI', 'SQL'] },
  { name: 'Statistical Analysis', category: 'Data & Analytics', aliases: ['Statistics'], level: 'mid', relatedSkills: ['R', 'Python', 'SPSS'] },
  { name: 'Data Visualization', category: 'Data & Analytics', aliases: ['Tableau', 'Power BI', 'Data Viz'], level: 'mid', relatedSkills: ['Business Intelligence', 'Dashboard Design'] },
  { name: 'Market Research', category: 'Data & Analytics', aliases: ['Consumer Research'], level: 'mid', relatedSkills: ['Data Analysis', 'Survey Design'] },
  { name: 'A/B Testing', category: 'Data & Analytics', aliases: ['Split Testing'], level: 'mid', relatedSkills: ['Statistical Analysis', 'Experimentation'] },
  { name: 'Reporting & Dashboards', category: 'Data & Analytics', aliases: ['Dashboard Design'], level: 'mid', relatedSkills: ['Data Visualization', 'Business Intelligence'] },
  { name: 'Predictive Analytics', category: 'Data & Analytics', aliases: ['Forecasting'], level: 'senior', relatedSkills: ['Machine Learning', 'Statistical Analysis'] },
  { name: 'KPI Tracking', category: 'Data & Analytics', aliases: ['Metrics', 'Performance Metrics'], level: 'mid', relatedSkills: ['Business Intelligence', 'Data Analysis'] },
  { name: 'HR Analytics', category: 'Data & Analytics', aliases: ['People Analytics'], level: 'mid', relatedSkills: ['Data Analysis', 'HRIS'] },

  // Mobile & Low-Code Development
  { name: 'Mobile App Development', category: 'Mobile Development', aliases: ['iOS Development', 'Android Development'], level: 'mid', relatedSkills: ['Swift', 'Kotlin', 'React Native'] },
  { name: 'Low-Code / No-Code Tools', category: 'Development Tools', aliases: ['Low-Code', 'No-Code'], level: 'entry', relatedSkills: ['Webflow', 'Bubble', 'Zapier'] },

  // Enterprise Systems
  { name: 'ERP / CRM Systems', category: 'Enterprise Systems', aliases: ['SAP', 'Salesforce', 'ERP', 'CRM'], level: 'mid', relatedSkills: ['Business Processes', 'System Integration'] },
  { name: 'CRM Management', category: 'Enterprise Systems', aliases: ['Customer Relationship Management'], level: 'mid', relatedSkills: ['Salesforce', 'HubSpot'] },

  // Business & Management
  { name: 'Financial Analysis', category: 'Business & Management', aliases: ['Financial Modeling'], level: 'mid', relatedSkills: ['Excel', 'Financial Planning'] },
  { name: 'Strategic Planning', category: 'Business & Management', aliases: ['Strategy'], level: 'senior', relatedSkills: ['Business Development', 'Market Analysis'] },
  { name: 'Business Development', category: 'Business & Management', aliases: ['BizDev', 'BD'], level: 'mid', relatedSkills: ['Sales', 'Partnerships'] },
  { name: 'Product Management', category: 'Business & Management', aliases: ['PM', 'Product Manager'], level: 'mid', relatedSkills: ['Roadmapping', 'User Stories', 'Agile'] },
  { name: 'Program Management', category: 'Business & Management', aliases: ['PgM'], level: 'senior', relatedSkills: ['Project Management', 'Stakeholder Management'] },
  { name: 'Operations Management', category: 'Business & Management', aliases: ['Operations', 'Ops'], level: 'mid', relatedSkills: ['Process Improvement', 'Supply Chain'] },
  { name: 'Process Improvement', category: 'Business & Management', aliases: ['Lean', 'Six Sigma', 'Kaizen'], level: 'mid', relatedSkills: ['Operations Management', 'Quality Assurance'] },
  { name: 'Risk Management', category: 'Business & Management', aliases: ['Risk Assessment'], level: 'senior', relatedSkills: ['Compliance', 'Strategic Planning'] },
  { name: 'Stakeholder Management', category: 'Business & Management', aliases: ['Stakeholder Engagement'], level: 'mid', relatedSkills: ['Communication', 'Relationship Management'] },
  { name: 'Change Management', category: 'Business & Management', aliases: ['Organizational Change'], level: 'senior', relatedSkills: ['Leadership', 'Communication'] },

  // Marketing & Sales
  { name: 'Digital Marketing', category: 'Marketing & Sales', aliases: ['Online Marketing'], level: 'mid', relatedSkills: ['SEO', 'Social Media', 'Content Marketing'] },
  { name: 'SEO / SEM', category: 'Marketing & Sales', aliases: ['SEO', 'SEM', 'Search Marketing'], level: 'mid', relatedSkills: ['Google Analytics', 'Keyword Research'] },
  { name: 'Content Marketing', category: 'Marketing & Sales', aliases: ['Content Strategy'], level: 'mid', relatedSkills: ['Copywriting', 'SEO'] },
  { name: 'Social Media Management', category: 'Marketing & Sales', aliases: ['Social Media Marketing'], level: 'entry', relatedSkills: ['Content Creation', 'Community Management'] },
  { name: 'Brand Strategy', category: 'Marketing & Sales', aliases: ['Branding'], level: 'senior', relatedSkills: ['Marketing Strategy', 'Brand Identity'] },
  { name: 'Performance Marketing', category: 'Marketing & Sales', aliases: ['Growth Marketing'], level: 'mid', relatedSkills: ['Digital Marketing', 'A/B Testing'] },
  { name: 'Growth Hacking', category: 'Marketing & Sales', aliases: ['Growth Strategy'], level: 'mid', relatedSkills: ['Marketing', 'Analytics', 'Experimentation'] },
  { name: 'Sales Strategy', category: 'Marketing & Sales', aliases: ['Sales Planning'], level: 'mid', relatedSkills: ['Business Development', 'Account Management'] },
  { name: 'Account Management', category: 'Marketing & Sales', aliases: ['Client Management'], level: 'mid', relatedSkills: ['Relationship Management', 'Sales'] },
  { name: 'Customer Acquisition & Retention', category: 'Marketing & Sales', aliases: ['Customer Retention'], level: 'mid', relatedSkills: ['Marketing', 'CRM'] },
  { name: 'Funnel Optimization', category: 'Marketing & Sales', aliases: ['Conversion Optimization'], level: 'mid', relatedSkills: ['A/B Testing', 'Analytics'] },

  // Human Resources
  { name: 'Talent Acquisition', category: 'Human Resources', aliases: ['Recruiting', 'Talent Management'], level: 'mid', relatedSkills: ['Candidate Sourcing', 'Interviewing'] },
  { name: 'Candidate Sourcing', category: 'Human Resources', aliases: ['Recruiting'], level: 'mid', relatedSkills: ['LinkedIn Recruiting', 'Boolean Search'] },
  { name: 'Interviewing & Assessment', category: 'Human Resources', aliases: ['Candidate Assessment'], level: 'mid', relatedSkills: ['Talent Acquisition', 'Behavioral Interviewing'] },
  { name: 'Employer Branding', category: 'Human Resources', aliases: ['Talent Branding'], level: 'mid', relatedSkills: ['Marketing', 'Recruiting'] },
  { name: 'Workforce Planning', category: 'Human Resources', aliases: ['Staffing Strategy'], level: 'senior', relatedSkills: ['HR Strategy', 'Business Planning'] },
  { name: 'Onboarding & Offboarding', category: 'Human Resources', aliases: ['Employee Onboarding'], level: 'mid', relatedSkills: ['HR Operations', 'Training'] },
  { name: 'Performance Management', category: 'Human Resources', aliases: ['Performance Reviews'], level: 'mid', relatedSkills: ['Coaching', 'Feedback'] },
  { name: 'Compensation & Benefits', category: 'Human Resources', aliases: ['Total Rewards'], level: 'mid', relatedSkills: ['HR Analytics', 'Benefits Administration'] },
  { name: 'Diversity, Equity & Inclusion', category: 'Human Resources', aliases: ['DEI', 'D&I'], level: 'mid', relatedSkills: ['Culture', 'Training'] },
  { name: 'Labor Law & Compliance', category: 'Human Resources', aliases: ['Employment Law', 'HR Compliance'], level: 'senior', relatedSkills: ['Legal', 'Risk Management'] },

  // Communication Skills
  { name: 'Verbal Communication', category: 'Communication Skills', aliases: ['Public Speaking'], level: 'entry', relatedSkills: ['Presentation Skills', 'Active Listening'] },
  { name: 'Written Communication', category: 'Communication Skills', aliases: ['Business Writing'], level: 'entry', relatedSkills: ['Documentation', 'Email Writing'] },
  { name: 'Presentation Skills', category: 'Communication Skills', aliases: ['Public Speaking'], level: 'mid', relatedSkills: ['PowerPoint', 'Storytelling'] },
  { name: 'Negotiation', category: 'Communication Skills', aliases: ['Negotiation Skills'], level: 'mid', relatedSkills: ['Conflict Resolution', 'Persuasion'] },
  { name: 'Conflict Resolution', category: 'Communication Skills', aliases: ['Dispute Resolution'], level: 'mid', relatedSkills: ['Mediation', 'Communication'] },
  { name: 'Active Listening', category: 'Communication Skills', aliases: ['Listening Skills'], level: 'entry', relatedSkills: ['Empathy', 'Communication'] },
  { name: 'Cross-Functional Collaboration', category: 'Communication Skills', aliases: ['Collaboration'], level: 'mid', relatedSkills: ['Teamwork', 'Stakeholder Management'] },
  { name: 'Stakeholder Communication', category: 'Communication Skills', aliases: ['Executive Communication'], level: 'mid', relatedSkills: ['Stakeholder Management', 'Presentation Skills'] },
  { name: 'Client Relationship Management', category: 'Communication Skills', aliases: ['Client Relations'], level: 'mid', relatedSkills: ['Account Management', 'Communication'] },

  // Leadership Skills
  { name: 'People Management', category: 'Leadership Skills', aliases: ['Team Management'], level: 'mid', relatedSkills: ['Leadership', 'Coaching'] },
  { name: 'Coaching & Mentoring', category: 'Leadership Skills', aliases: ['Mentoring', 'Coaching'], level: 'mid', relatedSkills: ['Leadership', 'Feedback'] },
  { name: 'Decision Making', category: 'Leadership Skills', aliases: ['Strategic Decision Making'], level: 'mid', relatedSkills: ['Critical Thinking', 'Analysis'] },
  { name: 'Delegation', category: 'Leadership Skills', aliases: ['Task Delegation'], level: 'mid', relatedSkills: ['Time Management', 'Leadership'] },
  { name: 'Performance Coaching', category: 'Leadership Skills', aliases: ['Employee Coaching'], level: 'mid', relatedSkills: ['Performance Management', 'Feedback'] },
  { name: 'Organizational Leadership', category: 'Leadership Skills', aliases: ['Executive Leadership'], level: 'senior', relatedSkills: ['Strategic Planning', 'Change Management'] },
  { name: 'Emotional Intelligence', category: 'Leadership Skills', aliases: ['EQ', 'EI'], level: 'mid', relatedSkills: ['Self-Awareness', 'Empathy'] },
  { name: 'Vision & Goal Setting', category: 'Leadership Skills', aliases: ['Goal Setting'], level: 'senior', relatedSkills: ['Strategic Planning', 'Leadership'] },

  // Design & Creative
  { name: 'UX/UI Design', category: 'Design & Creative', aliases: ['UX Design', 'UI Design', 'User Experience'], level: 'mid', relatedSkills: ['Figma', 'User Research', 'Prototyping'] },
  { name: 'Graphic Design', category: 'Design & Creative', aliases: ['Visual Design'], level: 'mid', relatedSkills: ['Adobe Creative Suite', 'Photoshop', 'Illustrator'] },
  { name: 'Product Design', category: 'Design & Creative', aliases: ['Design'], level: 'mid', relatedSkills: ['UX/UI Design', 'User Research'] },
  { name: 'Design Thinking', category: 'Design & Creative', aliases: ['Human-Centered Design'], level: 'mid', relatedSkills: ['Problem Solving', 'Innovation'] },
  { name: 'Prototyping', category: 'Design & Creative', aliases: ['Wireframing'], level: 'mid', relatedSkills: ['Figma', 'Sketch', 'UX Design'] },
  { name: 'User Research', category: 'Design & Creative', aliases: ['UX Research'], level: 'mid', relatedSkills: ['User Testing', 'Interviews'] },
  { name: 'Copywriting', category: 'Design & Creative', aliases: ['Content Writing'], level: 'mid', relatedSkills: ['Content Marketing', 'SEO'] },
  { name: 'Video Editing', category: 'Design & Creative', aliases: ['Video Production'], level: 'mid', relatedSkills: ['Adobe Premiere', 'Final Cut Pro'] },
  { name: 'Motion Graphics', category: 'Design & Creative', aliases: ['Animation'], level: 'mid', relatedSkills: ['After Effects', 'Video Editing'] },

  // Finance & Operations
  { name: 'Financial Planning & Budgeting', category: 'Finance & Operations', aliases: ['Budgeting', 'Financial Planning'], level: 'mid', relatedSkills: ['Excel', 'Financial Analysis'] },
  { name: 'Accounting', category: 'Finance & Operations', aliases: ['Financial Accounting'], level: 'mid', relatedSkills: ['Bookkeeping', 'QuickBooks'] },
  { name: 'Payroll Management', category: 'Finance & Operations', aliases: ['Payroll'], level: 'mid', relatedSkills: ['ADP', 'HR Systems'] },
  { name: 'Procurement', category: 'Finance & Operations', aliases: ['Purchasing'], level: 'mid', relatedSkills: ['Vendor Management', 'Negotiation'] },
  { name: 'Supply Chain Management', category: 'Finance & Operations', aliases: ['Supply Chain', 'SCM'], level: 'mid', relatedSkills: ['Logistics', 'Procurement'] },
  { name: 'Contract Management', category: 'Finance & Operations', aliases: ['Contract Administration'], level: 'mid', relatedSkills: ['Negotiation', 'Legal'] },
  { name: 'Compliance & Regulatory Knowledge', category: 'Finance & Operations', aliases: ['Compliance', 'Regulatory Compliance'], level: 'senior', relatedSkills: ['Risk Management', 'Auditing'] },
  { name: 'Quality Assurance', category: 'Finance & Operations', aliases: ['QA', 'Quality Control'], level: 'mid', relatedSkills: ['Testing', 'Process Improvement'] },
  { name: 'Vendor Management', category: 'Finance & Operations', aliases: ['Supplier Management'], level: 'mid', relatedSkills: ['Procurement', 'Relationship Management'] },

  // Personal Effectiveness
  { name: 'Time Management', category: 'Personal Effectiveness', aliases: ['Time Tracking', 'Productivity'], level: 'entry', relatedSkills: ['Organization', 'Prioritization'] },
  { name: 'Critical Thinking', category: 'Personal Effectiveness', aliases: ['Analytical Thinking'], level: 'mid', relatedSkills: ['Problem Solving', 'Analysis'] },
  { name: 'Adaptability', category: 'Personal Effectiveness', aliases: ['Flexibility'], level: 'entry', relatedSkills: ['Change Management', 'Resilience'] },
  { name: 'Stress Management', category: 'Personal Effectiveness', aliases: ['Resilience'], level: 'entry', relatedSkills: ['Work-Life Balance', 'Wellness'] },
  { name: 'Attention to Detail', category: 'Personal Effectiveness', aliases: ['Detail-Oriented'], level: 'entry', relatedSkills: ['Quality Assurance', 'Accuracy'] },
  { name: 'Multitasking', category: 'Personal Effectiveness', aliases: ['Task Management'], level: 'entry', relatedSkills: ['Time Management', 'Prioritization'] },
  { name: 'Self-Motivation', category: 'Personal Effectiveness', aliases: ['Self-Drive'], level: 'entry', relatedSkills: ['Initiative', 'Goal Setting'] },
  { name: 'Accountability', category: 'Personal Effectiveness', aliases: ['Ownership'], level: 'entry', relatedSkills: ['Responsibility', 'Integrity'] },
  { name: 'Continuous Learning', category: 'Personal Effectiveness', aliases: ['Lifelong Learning'], level: 'entry', relatedSkills: ['Growth Mindset', 'Self-Development'] },

  // Soft Skills (existing)
  { name: 'Project Management', category: 'Soft Skills', aliases: ['PM'], level: 'mid', relatedSkills: ['Agile', 'Scrum', 'Planning'] },
  { name: 'Team Leadership', category: 'Soft Skills', aliases: ['Leadership'], level: 'senior', relatedSkills: ['Mentoring', 'Communication'] },
  { name: 'Agile Methodologies', category: 'Soft Skills', aliases: ['Agile', 'Scrum'], level: 'mid', relatedSkills: ['Sprint Planning', 'Retrospectives'] },
  { name: 'Communication', category: 'Soft Skills', aliases: [], level: 'entry', relatedSkills: ['Presentation', 'Documentation'] },
  { name: 'Problem Solving', category: 'Soft Skills', aliases: [], level: 'entry', relatedSkills: ['Critical Thinking', 'Analysis'] },
]

export function searchSkills(query: string): SkillSuggestion[] {
  if (!query || query.length < 2) return []
  
  const normalizedQuery = query.toLowerCase()
  
  return SKILLS_DATABASE.filter(skill => {
    const matchesName = skill.name.toLowerCase().includes(normalizedQuery)
    const matchesAlias = skill.aliases.some(alias => 
      alias.toLowerCase().includes(normalizedQuery)
    )
    const matchesCategory = skill.category.toLowerCase().includes(normalizedQuery)
    
    return matchesName || matchesAlias || matchesCategory
  }).slice(0, 10) // Limit to 10 suggestions
}

export function getSkillsByCategory(category: string): SkillSuggestion[] {
  return SKILLS_DATABASE.filter(skill => skill.category === category)
}

export function getPopularSkills(): SkillSuggestion[] {
  // Return most commonly used skills across all categories
  return SKILLS_DATABASE.filter(skill =>
    [
      'JavaScript', 'Python', 'React', 'Node.js', 'Git', 'AWS',
      'Project Management', 'Data Analysis', 'Communication', 'Problem Solving',
      'Leadership', 'Excel', 'SQL', 'Agile Methodologies', 'Team Leadership',
      'Digital Marketing', 'Product Management', 'Business Development'
    ].includes(skill.name)
  )
}