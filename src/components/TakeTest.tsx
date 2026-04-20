import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MockTest, TestResult, Question } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Trophy, History, ClipboardList } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function TakeTest() {
  const { testId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      if (!testId) return;
      try {
        const docRef = doc(db, 'mockTests', testId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const testData = { id: docSnap.id, ...docSnap.data() } as MockTest;
          setTest(testData);
        } else {
          toast.error('Test not found');
          navigate('/mock-tests');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `mockTests/${testId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!test || !user || submitting) return;
    setSubmitting(true);

    const totalQuestions = test.questions.length;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedAnswers = 0;

    test.questions.forEach((q) => {
      if (answers[q.id] === undefined) {
        skippedAnswers++;
      } else if (answers[q.id] === q.correctOptionIndex) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const resultData: Omit<TestResult, 'id'> = {
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      skippedAnswers,
      completedAt: new Date().toISOString(),
      answers
    };

    try {
      const docRef = await addDoc(collection(db, 'testResults'), resultData);
      setResult({ id: docRef.id, ...resultData });
      setIsFinished(true);
      toast.success('Test submitted successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'testResults');
      toast.error('Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  }, [test, user, answers, submitting]);

  useEffect(() => {
    if (isFinished) return;
  }, [isFinished]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!test) return null;

  if (isFinished && result) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Test Completed!</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">Great job on finishing the {test.title}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Score</p>
              <p className="text-2xl font-bold text-blue-600">{result.score}%</p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Correct</p>
              <p className="text-2xl font-bold text-green-600">{result.correctAnswers}</p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Wrong</p>
              <p className="text-2xl font-bold text-red-600">{result.wrongAnswers}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/mock-tests')}
              className="flex-1 py-4 bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-all flex items-center justify-center gap-2"
            >
              <History className="w-5 h-5" />
              Back to Tests
            </button>
            <button 
              onClick={() => {
                setIsFinished(false);
                setAnswers({});
                setCurrentQuestionIndex(0);
              }}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              Retake Test
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Review Answers</h2>
          {test.questions.map((q, idx) => {
            const selected = answers[q.id];
            const isCorrect = selected === q.correctOptionIndex;
            return (
              <div key={q.id} className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-500 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-4">
                    <p className="font-medium text-neutral-900 dark:text-white">{q.text}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrectOpt = optIdx === q.correctOptionIndex;
                        const isSelectedOpt = optIdx === selected;
                        return (
                          <div 
                            key={optIdx}
                            className={cn(
                              "p-3 rounded-xl border text-sm transition-all",
                              isCorrectOpt ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" :
                              isSelectedOpt && !isCorrectOpt ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" :
                              "bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{opt}</span>
                              {isCorrectOpt && <CheckCircle2 className="w-4 h-4" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to leave? Your progress will be lost.')) {
                navigate('/mock-tests');
              }
            }}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-500" />
          </button>
          <div>
            <h1 className="font-bold text-neutral-900 dark:text-white truncate max-w-[200px] sm:max-w-md">{test.title}</h1>
            <p className="text-xs text-neutral-500">Question {currentQuestionIndex + 1} of {test.questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
          <ClipboardList className="w-4 h-4" />
          {test.questions.length} Questions
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <motion.div 
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
          >
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: idx })}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                    answers[currentQuestion.id] === idx 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" 
                      : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
                      answers[currentQuestion.id] === idx 
                        ? "bg-blue-600 text-white" 
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:bg-neutral-200"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-medium">{option}</span>
                  </div>
                  {answers[currentQuestion.id] === idx && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center justify-between">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-6 py-3 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {currentQuestionIndex === test.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
                <CheckCircle2 className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-8 py-3 bg-neutral-900 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Question Navigator</h3>
            <div className="grid grid-cols-4 gap-2">
              {test.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={cn(
                    "w-full aspect-square rounded-xl text-xs font-bold transition-all",
                    currentQuestionIndex === idx ? "ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-neutral-900" : "",
                    answers[q.id] !== undefined 
                      ? "bg-blue-600 text-white" 
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30">
            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Answered</span>
                <span className="font-bold text-neutral-900 dark:text-white">{Object.keys(answers).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Remaining</span>
                <span className="font-bold text-neutral-900 dark:text-white">{test.questions.length - Object.keys(answers).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
