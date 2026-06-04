"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialForm = {
  name: "",
  email: "",
  contact: "",
  organization: "",
  message: "",
};

const BookDemoForm = ({ open, onOpenChange }) => {
  const [form, setForm] = useState(initialForm);
  const [captchaSiteKey, setCaptchaSiteKey] = useState(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
      process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ||
      "",
  );
  const [captchaToken, setCaptchaToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [captchaRendered, setCaptchaRendered] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);
  useEffect(() => {
    if (captchaSiteKey) return;

    const loadCaptchaKey = async () => {
      try {
        const res = await fetch("/api/book-demo");
        const data = await res.json();

        if (!res.ok || !data.siteKey) {
          throw new Error(data.error || "Captcha is not configured");
        }

        setCaptchaSiteKey(data.siteKey);
      } catch (error) {
        console.error("Failed to load captcha:", error);
        toast.error("Unable to load captcha");
      }
    };

    loadCaptchaKey();
  }, [captchaSiteKey]);

  useEffect(() => {
    if (window.grecaptcha) {
      setScriptReady(true);
    }
  }, []);

  const renderCaptcha = useCallback(() => {
    if (
      !captchaSiteKey ||
      !captchaRef.current ||
      !window.grecaptcha?.render ||
      widgetIdRef.current !== null
    ) {
      return false;
    }

    try {
      captchaRef.current.innerHTML = "";
      widgetIdRef.current = window.grecaptcha.render(captchaRef.current, {
        sitekey: captchaSiteKey,
        theme: "dark",
        callback: (token) => {
          setCaptchaToken(token);
          setCaptchaError("");
        },
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => {
          setCaptchaToken("");
          setCaptchaError("Captcha could not be verified. Please reload.");
        },
      });
      setCaptchaRendered(true);
      setCaptchaError("");
      return true;
    } catch (error) {
      console.error("Captcha render failed:", error);
      setCaptchaError("Captcha could not load. Please reload the page.");
      return false;
    }
  }, [captchaSiteKey]);

  useEffect(() => {
    if (!open) {
      widgetIdRef.current = null;
      setCaptchaRendered(false);
      setCaptchaToken("");
      setCaptchaError("");
      return;
    }

    if (!captchaSiteKey || !scriptReady || widgetIdRef.current !== null) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 40;

    const timer = window.setInterval(() => {
      attempts += 1;

      if (window.grecaptcha?.ready) {
        window.grecaptcha.ready(() => {
          if (renderCaptcha()) {
            window.clearInterval(timer);
          }
        });
      } else if (renderCaptcha()) {
        window.clearInterval(timer);
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        setCaptchaError(
          "Captcha is taking too long to load. Please refresh and try again.",
        );
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [captchaSiteKey, open, renderCaptcha, scriptReady]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setCaptchaToken("");
    setCaptchaError("");

    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!captchaToken) {
      toast.error("Please complete the captcha");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/book-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          captchaToken,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit demo request");
      }

      toast.success("Demo request sent successfully");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Book demo submit failed:", error);
      toast.error(error.message || "Failed to submit demo request");

      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
        setCaptchaToken("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => {
          setScriptReady(false);
          setCaptchaError("Captcha script failed to load.");
        }}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/15 bg-[#0b0b0b] text-white shadow-2xl shadow-black/70 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Book a Demo</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Share a few details and we will contact you shortly.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="demo-name" className="text-neutral-200">
                  Name
                </Label>
                <Input
                  id="demo-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Your name"
                  className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-[#9d1c1b]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-email" className="text-neutral-200">
                  Email
                </Label>
                <Input
                  id="demo-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-[#9d1c1b]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demo-contact" className="text-neutral-200">
                  Contact
                </Label>
                <Input
                  id="demo-contact"
                  value={form.contact}
                  onChange={(event) =>
                    updateField("contact", event.target.value)
                  }
                  placeholder="Phone number"
                  className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-[#9d1c1b]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="demo-organization"
                  className="text-neutral-200"
                >
                  Organization Name
                </Label>
                <Input
                  id="demo-organization"
                  value={form.organization}
                  onChange={(event) =>
                    updateField("organization", event.target.value)
                  }
                  placeholder="Organization"
                  className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-[#9d1c1b]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-message" className="text-neutral-200">
                Message
              </Label>
              <Textarea
                id="demo-message"
                value={form.message}
                onChange={(event) =>
                  updateField("message", event.target.value)
                }
                placeholder="Tell us what you want to manage"
                rows={4}
                className="border-white/15 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-[#9d1c1b]"
                required
              />
            </div>

            <div className="min-h-[78px]">
              <div ref={captchaRef} />
              {!captchaRendered && !captchaError && (
                <p className="pt-2 text-sm text-neutral-500">
                  Loading verification...
                </p>
              )}
              {captchaError && (
                <p className="pt-2 text-sm text-red-400">{captchaError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#9d1c1b] text-white hover:bg-[#8b1918]"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send Request <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookDemoForm;
