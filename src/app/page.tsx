"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput } from '@/ai/flows/generate-quiz-from-pdf';
import type { QuizQuestion, QuizFeedback, AppState } from '@/types/quiz';
import { UploadCloud, FileText, Lightbulb, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from '@/components/loading-spinner';

export default function HomePage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<number, QuizFeedback>>({});
  const [score, setScore] = useState<number>(0);
  const [appState, setAppState] = useState<AppState>('upload');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  const resetQuizState = () => {
    setPdfFile(null);
    setPdfDataUri(null);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuestionFeedback({});
    setScore(0);
    setAppState('upload');
    setErrorMessage(null);
    setIsLoading(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        setPdfFile(null);
        setPdfDataUri(null);
        // Clear file input field
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPdfDataUri(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage(null); // Clear previous errors
    }
  };

  const handleGenerateQuiz = async () => {
    if (!pdfDataUri) {
      toast({
        title: "No PDF Selected",
        description: "Please upload a PDF file to generate a quiz.",
        variant: "destructive",
      });
      setPdfFile(null);
      setPdfDataUri(null);
      return;
    }

    setIsLoading(true);
    setAppState('generating');
    setErrorMessage(null);

    try {
      const input: GenerateQuizInput = { pdfDataUri };
      const output: GenerateQuizOutput = await generateQuiz(input);
      
      if (!output.quiz || output.quiz.length === 0) {
        setErrorMessage("The AI could not generate a quiz from this PDF. Please try another PDF or check the PDF content.");
        setAppState('error');
        setIsLoading(false);
        return;
      }

      setQuizData(output.quiz);
      setAppState('inProgress');
    } catch (error) {
      console.error("Error generating quiz:", error);
      setErrorMessage("An error occurred while generating the quiz. Please try again.");
      setAppState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = (questionIndex: number, selectedOption: string) => {
    if (!quizData) return;

    const currentQuestion = quizData[questionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: selectedOption }));
    setQuestionFeedback(prev => ({
      ...prev,
      [questionIndex]: {
        selectedAnswer: selectedOption,
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
      }
    }));

    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (quizData && currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setAppState('completed');
    }
  };

  const currentQuesFeedback = questionFeedback[currentQuestionIndex];
  const currentQuesSelectedAnswer = selectedAnswers[currentQuestionIndex];

  const renderContent = () => {
    switch (appState) {
      case 'upload':
        return (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UploadCloud className="text-primary" size={28} /> Upload PDF
              </CardTitle>
              <CardDescription>Select a PDF file from your device to generate a quiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="pdf-upload" className="text-base">Choose PDF File</Label>
                <Input id="pdf-upload" type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange}
                  className="mt-2 file:mr-4 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              {pdfFile && (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-secondary/50">
                  <FileText className="text-primary" size={24} />
                  <span className="text-sm font-medium">{pdfFile.name}</span>
                </div>
              )}
              <Button onClick={handleGenerateQuiz} disabled={!pdfFile || isLoading} className="w-full text-lg py-6">
                {isLoading ? <LoadingSpinner className="mr-2" /> : <Lightbulb className="mr-2" />}
                Generate Quiz
              </Button>
            </CardContent>
          </Card>
        );

      case 'generating':
        return (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Generating Quiz</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
              <LoadingSpinner className="w-12 h-12 text-primary" />
              <p className="text-muted-foreground">Please wait while we analyze your PDF and create your quiz...</p>
              {pdfFile && <p className="text-sm font-medium text-primary">{pdfFile.name}</p>}
            </CardContent>
          </Card>
        );

      case 'inProgress':
        if (!quizData) return null;
        const currentQuestion = quizData[currentQuestionIndex];
        const progressValue = ((currentQuestionIndex + 1) / quizData.length) * 100;
        return (
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-2xl">Question {currentQuestionIndex + 1} of {quizData.length}</CardTitle>
                <Trophy className="text-accent" size={28} />
              </div>
              <Progress value={progressValue} className="w-full h-3 [&>div]:bg-accent" />
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xl font-semibold min-h-[60px]">{currentQuestion.question}</p>
              <RadioGroup
                value={currentQuesSelectedAnswer}
                onValueChange={(value) => {
                  if (!currentQuesFeedback) { // Allow changing answer only if not submitted yet for this question
                     setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: value }));
                  }
                }}
                disabled={!!currentQuesFeedback}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <Label
                    key={index}
                    htmlFor={`option-${index}`}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-150 ease-in-out  
                      ${currentQuesFeedback ? 
                        (option === currentQuestion.correctAnswer ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500' : 
                         option === currentQuesFeedback.selectedAnswer ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500' : 'border-border hover:border-primary/50')
                        : (currentQuesSelectedAnswer === option ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-border hover:border-primary/50')}
                    `}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} className="mr-3" />
                    <span className="text-base">{option}</span>
                  </Label>
                ))}
              </RadioGroup>

              {currentQuesFeedback && (
                <Alert variant={currentQuesFeedback.isCorrect ? "default" : "destructive"} className={`border-2 ${currentQuesFeedback.isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                  {currentQuesFeedback.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <AlertTitle className={`font-bold ${currentQuesFeedback.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {currentQuesFeedback.isCorrect ? "Correct!" : "Incorrect"}
                  </AlertTitle>
                  {!currentQuesFeedback.isCorrect && (
                    <AlertDescription className="text-sm text-red-600">
                      The correct answer was: <strong>{currentQuesFeedback.correctAnswer}</strong>
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {!currentQuesFeedback ? (
                <Button onClick={() => handleAnswerSubmit(currentQuestionIndex, currentQuesSelectedAnswer || "")} disabled={!currentQuesSelectedAnswer} className="w-full text-lg py-6">
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="w-full text-lg py-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                  {currentQuestionIndex < quizData.length - 1 ? "Next Question" : "View Results"}
                  <ArrowRight className="ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case 'completed':
        if (!quizData) return null;
        return (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <Trophy className="mx-auto text-accent mb-4" size={64} />
              <CardTitle className="text-3xl font-bold">Quiz Completed!</CardTitle>
              <CardDescription className="text-lg">You scored</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-6xl font-bold text-primary">
                {score} <span className="text-3xl text-muted-foreground">/ {quizData.length}</span>
              </p>
              <div className="w-3/4 mx-auto">
                <Progress value={(score / quizData.length) * 100} className="h-4 [&>div]:bg-primary" />
              </div>
              <Button onClick={resetQuizState} className="w-full text-lg py-6">
                <RotateCcw className="mr-2" /> Try Another Quiz
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-destructive">
                <AlertCircle size={28} /> Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-lg text-destructive-foreground">{errorMessage || "An unknown error occurred."}</p>
              <Button onClick={resetQuizState} variant="outline" className="w-full text-lg py-6">
                <RotateCcw className="mr-2" /> Try Again
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold text-primary tracking-tight">Creativeminds<span className="text-accent"> PDF</span></h1>
        <p className="text-lg text-muted-foreground mt-2">Upload a PDF, generate a quiz, and test your knowledge!</p>
      </header>
      <main className="w-full max-w-2xl">
        {renderContent()}
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CreativemindsPDF. Powered by AI.</p>
      </footer>
    </div>
  );
}
