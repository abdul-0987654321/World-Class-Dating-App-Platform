import React, { useState } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiX, FiCheck } from 'react-icons/fi';

interface Prompt {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface PromptQuestion {
  id: string;
  question: string;
  category: string;
  emoji?: string;
}

interface ProfilePromptsProps {
  prompts: Prompt[];
  isOwnProfile: boolean;
  maxPrompts?: number;
  availableQuestions: PromptQuestion[];
  onAddPrompt: (questionId: string, answer: string) => void;
  onEditPrompt: (promptId: string, answer: string) => void;
  onDeletePrompt: (promptId: string) => void;
}

const Container = styled.div`
  padding: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors?.text || '#333'};
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #4ecdc4, #95e1d3);
  border: none;
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PromptsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PromptCard = styled.div`
  background: ${({ theme }) => theme.colors?.backgroundSecondary || '#f8f9fa'};
  border-radius: 16px;
  padding: 20px;
  position: relative;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
`;

const PromptQuestion = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors?.primary || '#4ECDC4'};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PromptEmoji = styled.span`
  font-size: 18px;
`;

const PromptAnswer = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  line-height: 1.5;
  margin: 0;
`;

const PromptActions = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;

  ${PromptCard}:hover & {
    opacity: 1;
  }
`;

const IconButton = styled.button<{ variant?: 'danger' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${({ variant }) =>
    variant === 'danger' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ variant }) => (variant === 'danger' ? '#FF6B6B' : '#666')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${({ variant }) =>
      variant === 'danger' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors?.textSecondary || '#666'};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  margin-bottom: 16px;
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const CategorySection = styled.div`
  margin-bottom: 24px;
`;

const CategoryTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #999;
  margin-bottom: 12px;
`;

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QuestionItem = styled.button<{ isSelected: boolean; isUsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ isSelected }) => (isSelected ? 'rgba(78, 205, 196, 0.1)' : 'white')};
  border: 1px solid ${({ isSelected }) => (isSelected ? '#4ECDC4' : '#eee')};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ isUsed }) => (isUsed ? '#999' : '#333')};
  cursor: ${({ isUsed }) => (isUsed ? 'not-allowed' : 'pointer')};
  text-align: left;
  transition: all 0.2s;
  opacity: ${({ isUsed }) => (isUsed ? 0.5 : 1)};

  &:hover:not(:disabled) {
    border-color: ${({ isUsed }) => (isUsed ? '#eee' : '#4ECDC4')};
  }
`;

const QuestionText = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AnswerSection = styled.div`
  padding: 20px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
`;

const SelectedQuestion = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #4ecdc4;
  margin-bottom: 12px;
`;

const AnswerTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 14px;
  resize: none;

  &:focus {
    outline: none;
    border-color: #4ecdc4;
  }
`;

const CharacterCount = styled.div`
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${({ variant }) =>
    variant === 'primary'
      ? `
      background: linear-gradient(135deg, #4ECDC4, #95E1D3);
      border: none;
      color: white;

      &:hover {
        box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `
      : `
      background: white;
      border: 1px solid #ddd;
      color: #333;

      &:hover {
        background: #f5f5f5;
      }
    `}
`;

// Prompt Categories with Emojis
const promptCategories = [
  { id: 'about', name: 'About Me', emoji: '👋' },
  { id: 'values', name: 'My Values', emoji: '💫' },
  { id: 'lifestyle', name: 'Lifestyle', emoji: '🌟' },
  { id: 'dating', name: 'Dating', emoji: '💕' },
  { id: 'fun', name: 'Fun Facts', emoji: '🎉' },
  { id: 'preferences', name: 'Preferences', emoji: '✨' },
];

// Default prompt questions
const defaultQuestions: PromptQuestion[] = [
  { id: 'q1', question: "I'm looking for...", category: 'dating', emoji: '💝' },
  { id: 'q2', question: 'My ideal first date is...', category: 'dating', emoji: '🌹' },
  { id: 'q3', question: 'A deal breaker for me is...', category: 'dating', emoji: '🚫' },
  { id: 'q4', question: 'My weekend looks like...', category: 'lifestyle', emoji: '☀️' },
  { id: 'q5', question: "I'm passionate about...", category: 'about', emoji: '🔥' },
  { id: 'q6', question: 'What I value most is...', category: 'values', emoji: '💎' },
  { id: 'q7', question: 'My love language is...', category: 'dating', emoji: '💕' },
  { id: 'q8', question: "I'll know we're a match if...", category: 'dating', emoji: '✨' },
  { id: 'q9', question: "Something I'm really good at...", category: 'about', emoji: '🏆' },
  { id: 'q10', question: 'A fun fact about me...', category: 'fun', emoji: '🎭' },
  { id: 'q11', question: 'My most controversial opinion is...', category: 'fun', emoji: '🌶️' },
  { id: 'q12', question: 'I geek out about...', category: 'about', emoji: '🤓' },
  { id: 'q13', question: 'My favorite travel memory is...', category: 'lifestyle', emoji: '✈️' },
  { id: 'q14', question: 'Green flag I look for...', category: 'dating', emoji: '🟢' },
  { id: 'q15', question: 'My happy place is...', category: 'lifestyle', emoji: '🏡' },
  { id: 'q16', question: "I won't shut up about...", category: 'about', emoji: '🗣️' },
  { id: 'q17', question: 'My dream dinner guest is...', category: 'fun', emoji: '🍽️' },
  { id: 'q18', question: 'Two truths and a lie...', category: 'fun', emoji: '🤔' },
  { id: 'q19', question: "You'll find me on a Sunday...", category: 'lifestyle', emoji: '😴' },
  { id: 'q20', question: 'My comfort food is...', category: 'preferences', emoji: '🍕' },
];

const MAX_ANSWER_LENGTH = 200;

export const ProfilePrompts: React.FC<ProfilePromptsProps> = ({
  prompts,
  isOwnProfile,
  maxPrompts = 3,
  availableQuestions = defaultQuestions,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<PromptQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // Get used question IDs
  const usedQuestionIds = prompts.map((p) => {
    const question = availableQuestions.find((q) => q.question === p.question);
    return question?.id;
  });

  // Group questions by category
  const questionsByCategory = availableQuestions.reduce(
    (acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = [];
      }
      acc[question.category].push(question);
      return acc;
    },
    {} as Record<string, PromptQuestion[]>
  );

  const handleOpenAddModal = () => {
    setSelectedQuestion(null);
    setAnswer('');
    setShowAddModal(true);
  };

  const handleSelectQuestion = (question: PromptQuestion) => {
    if (usedQuestionIds.includes(question.id)) return;
    setSelectedQuestion(question);
    setAnswer('');
  };

  const handleAddPrompt = () => {
    if (!selectedQuestion || !answer.trim()) return;
    onAddPrompt(selectedQuestion.id, answer.trim());
    setShowAddModal(false);
    setSelectedQuestion(null);
    setAnswer('');
  };

  const handleOpenEditModal = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setAnswer(prompt.answer);
    setShowEditModal(true);
  };

  const handleEditPrompt = () => {
    if (!editingPrompt || !answer.trim()) return;
    onEditPrompt(editingPrompt.id, answer.trim());
    setShowEditModal(false);
    setEditingPrompt(null);
    setAnswer('');
  };

  const getCategoryInfo = (categoryId: string) => {
    return promptCategories.find((c) => c.id === categoryId) || { name: categoryId, emoji: '📝' };
  };

  return (
    <Container>
      <SectionHeader>
        <SectionTitle>My Prompts</SectionTitle>
        {isOwnProfile && prompts.length < maxPrompts && (
          <AddButton onClick={handleOpenAddModal}>
            <FiPlus /> Add Prompt
          </AddButton>
        )}
      </SectionHeader>

      {prompts.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyText>
            {isOwnProfile ? 'Add prompts to help others get to know you better!' : 'No prompts yet'}
          </EmptyText>
          {isOwnProfile && (
            <AddButton onClick={handleOpenAddModal}>
              <FiPlus /> Add Your First Prompt
            </AddButton>
          )}
        </EmptyState>
      ) : (
        <PromptsGrid>
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id}>
              <PromptQuestion>
                <PromptEmoji>
                  {availableQuestions.find((q) => q.question === prompt.question)?.emoji || '💬'}
                </PromptEmoji>
                {prompt.question}
              </PromptQuestion>
              <PromptAnswer>{prompt.answer}</PromptAnswer>
              {isOwnProfile && (
                <PromptActions>
                  <IconButton onClick={() => handleOpenEditModal(prompt)}>
                    <FiEdit2 />
                  </IconButton>
                  <IconButton variant="danger" onClick={() => onDeletePrompt(prompt.id)}>
                    <FiTrash2 />
                  </IconButton>
                </PromptActions>
              )}
            </PromptCard>
          ))}
        </PromptsGrid>
      )}

      {/* Add Prompt Modal */}
      {showAddModal && (
        <ModalOverlay onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Choose a Prompt</ModalTitle>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {Object.entries(questionsByCategory).map(([categoryId, questions]) => (
                <CategorySection key={categoryId}>
                  <CategoryTitle>
                    {getCategoryInfo(categoryId).emoji} {getCategoryInfo(categoryId).name}
                  </CategoryTitle>
                  <QuestionList>
                    {questions.map((question) => (
                      <QuestionItem
                        key={question.id}
                        isSelected={selectedQuestion?.id === question.id}
                        isUsed={usedQuestionIds.includes(question.id)}
                        onClick={() => handleSelectQuestion(question)}
                        disabled={usedQuestionIds.includes(question.id)}
                      >
                        <QuestionText>
                          <span>{question.emoji}</span>
                          {question.question}
                        </QuestionText>
                        {selectedQuestion?.id === question.id && <FiCheck color="#4ECDC4" />}
                        {usedQuestionIds.includes(question.id) && (
                          <span style={{ fontSize: '12px', color: '#999' }}>Used</span>
                        )}
                        {!usedQuestionIds.includes(question.id) &&
                          selectedQuestion?.id !== question.id && <FiChevronRight color="#ccc" />}
                      </QuestionItem>
                    ))}
                  </QuestionList>
                </CategorySection>
              ))}
            </ModalBody>

            {selectedQuestion && (
              <AnswerSection>
                <SelectedQuestion>
                  {selectedQuestion.emoji} {selectedQuestion.question}
                </SelectedQuestion>
                <AnswerTextarea
                  placeholder="Write your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                  autoFocus
                />
                <CharacterCount>
                  {answer.length}/{MAX_ANSWER_LENGTH}
                </CharacterCount>
              </AnswerSection>
            )}

            <ModalFooter>
              <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleAddPrompt}
                disabled={!selectedQuestion || !answer.trim()}
              >
                Add Prompt
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Edit Prompt Modal */}
      {showEditModal && editingPrompt && (
        <ModalOverlay onClick={() => setShowEditModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Prompt</ModalTitle>
              <CloseButton onClick={() => setShowEditModal(false)}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <SelectedQuestion>
                {availableQuestions.find((q) => q.question === editingPrompt.question)?.emoji ||
                  '💬'}{' '}
                {editingPrompt.question}
              </SelectedQuestion>
              <AnswerTextarea
                placeholder="Write your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                autoFocus
              />
              <CharacterCount>
                {answer.length}/{MAX_ANSWER_LENGTH}
              </CharacterCount>
            </ModalBody>

            <ModalFooter>
              <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditPrompt} disabled={!answer.trim()}>
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default ProfilePrompts;
