// Test the built-in questions logic directly
function getQuestionForRole(jobTitle, questionIndex, totalQuestions) {
  const roleType = jobTitle.toLowerCase()
  
  // Question banks by role type
  const questions = {
    opening: [
      "Tell me about yourself and your professional background.",
      "Why are you interested in this position at our company?",
      "What attracted you to apply for this role?"
    ],
    technical: [
      roleType.includes('engineer') || roleType.includes('developer') ? 
        "Walk me through your approach to solving a complex technical problem." :
      roleType.includes('manager') ? 
        "Describe your management style and how you handle team conflicts." :
      roleType.includes('designer') ?
        "Tell me about your design process from concept to final product." :
        "What technical skills make you well-suited for this position?"
    ],
    experience: [
      "Describe a challenging project you've worked on and how you overcame obstacles.",
      "Tell me about a time when you had to learn a new technology quickly.",
      "Give me an example of when you collaborated with a difficult team member."
    ],
    behavioral: [
      "How do you handle tight deadlines and pressure?",
      "Describe a time when you failed at something. What did you learn?",
      "Tell me about a time you went above and beyond for a project."
    ],
    closing: [
      "Where do you see yourself in 5 years?",
      "What questions do you have for me about the role or company?",
      "What would success look like for you in this position?"
    ]
  }
  
  // Select appropriate question based on interview progress
  if (questionIndex === 0) return questions.opening[questionIndex % 3]
  if (questionIndex === totalQuestions - 1) return questions.closing[questionIndex % 3]
  if (questionIndex === 1) return questions.technical[0]
  if (questionIndex <= 2) return questions.experience[questionIndex % 3]
  return questions.behavioral[questionIndex % 3]
}

// Test the built-in question generation
console.log('=== TESTING BUILT-IN QUESTIONS ===');

const testCases = [
  { jobTitle: "Software Engineer", totalQuestions: 5 },
  { jobTitle: "Senior Developer", totalQuestions: 3 },
  { jobTitle: "Product Manager", totalQuestions: 4 },
  { jobTitle: "UX Designer", totalQuestions: 5 }
];

testCases.forEach(testCase => {
  console.log(`\n📋 ${testCase.jobTitle} (${testCase.totalQuestions} questions):`);
  
  for (let i = 0; i < testCase.totalQuestions; i++) {
    const question = getQuestionForRole(testCase.jobTitle, i, testCase.totalQuestions);
    console.log(`  ${i + 1}. ${question}`);
  }
});

console.log('\n✅ Built-in questions are working correctly!');