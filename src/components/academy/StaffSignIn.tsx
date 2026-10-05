import SignInForm from "./SignInForm";

/**
 * What a signed-out visitor sees on an instructor page.
 *
 * These pages used to return 404 to everybody who was not a signed-in
 * instructor, which is right for a trainee and wrong for the instructor
 * herself. Opening the roster link on a phone where she had not signed in gave
 * her a 404 — indistinguishable from the page being broken, and she has no way
 * to tell those apart.
 *
 * So the test is split. Signed out, you get this: a sign-in form, which is the
 * same thing /academy shows and therefore reveals nothing new about the
 * section's existence. Signed in and not an instructor, you still get 404 —
 * because by then we know who you are, and a trainee should not be able to
 * confirm that a staff page is there.
 */
export default function StaffSignIn({ area }: { area: string }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="shell grid items-start gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
        <div>
          <span className="eyebrow">Tax Academy · staff</span>
          <h1 className="mt-3 text-[clamp(28px,4.6vw,40px)] leading-[1.08]">
            Sign in to see {area}
          </h1>
          <p className="lede mt-5">
            This part of the Academy is for instructors. Sign in with the
            address you teach from and the page will open.
          </p>
          <p className="mt-6 max-w-[56ch] text-[15px] leading-relaxed text-ink/65">
            You get a six-digit code by email. There is no password to
            remember, and the code works once.
          </p>
          <p className="mt-6 max-w-[56ch] text-[14.5px] leading-relaxed text-ink/55">
            If you signed in and landed back here, the address you used is on
            the roster as a trainee rather than an instructor.
          </p>
        </div>

        <div className="lg:pt-10">
          <SignInForm />
        </div>
      </div>
    </section>
  );
}
