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

  // Soft Skills
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
  // Return most commonly used skills
  return SKILLS_DATABASE.filter(skill => 
    ['JavaScript', 'Python', 'React', 'Node.js', 'Git', 'AWS', 'SQL', 'Communication'].includes(skill.name)
  )
}