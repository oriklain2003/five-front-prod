/**
 * Generic steps handler utility
 * Handles sequential display of answers from steps with delays
 */

export interface Step {
  question: string;
  answers: string[];
}

export interface StepHandlerOptions {
  steps: Step[];
  currentStepIndex: number;
  addMessage: (message: string, isUser: boolean, buttons?: Array<{label: string; action: string; data?: any}>) => void;
  delayBetweenAnswers?: number; // Default: 300ms
  delayBeforeNextQuestion?: number; // Default: 500ms
}

/**
 * Process a step by displaying all answers combined with the next question in a single message
 */
export const processStep = (options: StepHandlerOptions): void => {
  const {
    steps,
    currentStepIndex,
    addMessage,
    delayBetweenAnswers = 300,
    delayBeforeNextQuestion = 500
  } = options;

  // First, add user's "כן" response
  addMessage('כן', true);

  const currentStep = steps[currentStepIndex];
  
  if (!currentStep) {
    console.error('Invalid step index:', currentStepIndex);
    return;
  }

  // Delay before showing the combined message
  setTimeout(() => {
    // Combine all answers into one message
    let combinedMessage = '';
    
    if (currentStep.answers.length === 1) {
      // Single answer - no numbering
      combinedMessage = currentStep.answers[0];
    } else {
      // Multiple answers - number them
      combinedMessage = currentStep.answers
        .map((answer, index) => `${index + 1}. ${answer}`)
        .join('\n\n');
    }

    // Check if there's a next step
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      
      // Append next question to the message with separator
      combinedMessage += '\n\n' + nextStep.question;
      
      // Add the combined message with button for next step
      addMessage(combinedMessage, false, [
        {
          label: 'כן',
          action: 'next_step',
          data: {
            steps: steps,
            currentStepIndex: nextStepIndex
          }
        }
      ]);
    } else {
      // Last step - no next question, just show answers
      addMessage(combinedMessage, false);
    }
  }, delayBetweenAnswers);
};

