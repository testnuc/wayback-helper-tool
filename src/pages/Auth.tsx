import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Ripple } from "@/components/Ripple";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/auth',
            data: {
              email,
            }
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("User already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
            setIsSignUp(false);
          } else {
            toast.error(signUpError.message);
          }
          return;
        }

        if (signUpData.user) {
          if (signUpData.user.identities?.length === 0) {
            toast.error("This email is already registered. Please sign in instead.");
            setIsSignUp(false);
          } else {
            toast.success("Please check your email to verify your account!");
            console.log("Signup successful, verification email sent");
          }
        }
      } else {
        // Sign In flow
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          if (signInError.message === "Email not confirmed") {
            toast.error("Please verify your email before signing in.");
          } else if (signInError.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error(signInError.message);
          }
          return;
        }
        
        if (signInData.user) {
          toast.success("Successfully signed in!");
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "An error occurred during authentication");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <Ripple count={5} color="bg-primary/5" />
      
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
        <span>Discover historical website data with Wayback Finder</span>
      </div>

      <h1 className="text-3xl font-bold text-center mb-8">
        Wayback Machine URL Extractor
      </h1>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create an account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Enter your email below to create your account"
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;