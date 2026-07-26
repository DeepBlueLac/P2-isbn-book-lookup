"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CATEGORIES = [
  { index: "01", name: "Literature", detail: "Novels & classics" },
  { index: "02", name: "Science", detail: "Ideas & discovery" },
  { index: "03", name: "History", detail: "People & eras" },
  { index: "04", name: "Design", detail: "Objects & systems" },
  { index: "05", name: "Biography", detail: "Lives & voices" },
];

const SHELF_SPINES = ["Orbit", "Archive", "Field", "Signal", "Atlas", "Matter", "Index", "Future", "Form"];

type CinematicHomeProps = {
  heroContent: ReactNode;
  preview: ReactNode;
};

export function CinematicHome({ heroContent, preview }: CinematicHomeProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();

    media.add({
      desktop: "(min-width: 921px)",
      mobile: "(max-width: 920px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
      finePointer: "(pointer: fine)",
    }, (context) => {
      const conditions = context.conditions as {
        desktop: boolean;
        mobile: boolean;
        reduceMotion: boolean;
        finePointer: boolean;
      };

      if (conditions.reduceMotion) {
        gsap.set(".cinematic-home *", { clearProps: "transform,opacity,visibility,filter,clipPath" });
        return;
      }

      const fragments = gsap.utils.toArray<HTMLElement>(".search-fragment");
      const fragmentOrigins = [
        { x: -310, y: -170, rotation: -24 },
        { x: 260, y: -190, rotation: 19 },
        { x: -360, y: 130, rotation: 31 },
        { x: 330, y: 120, rotation: -18 },
        { x: 40, y: -250, rotation: 12 },
      ];

      gsap.set(fragments, {
        x: (index) => fragmentOrigins[index]?.x ?? 0,
        y: (index) => fragmentOrigins[index]?.y ?? 0,
        rotation: (index) => fragmentOrigins[index]?.rotation ?? 0,
        scale: 1,
        autoAlpha: 0,
      });

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => gsap.set([
          ".portal-art",
          ".hero-book-rig",
          ".hero-book-shadow",
          ".search-fragment",
        ], { willChange: "auto" }),
      });
      intro
        .fromTo(".portal-art", {
          scale: 1.22,
          filter: "blur(18px) brightness(.42)",
        }, {
          scale: 1.04,
          filter: "blur(0px) brightness(.76)",
          duration: 1.35,
          ease: "power2.out",
        }, 0)
        .fromTo(".hero-book-rig", {
          autoAlpha: 0,
          z: -900,
          rotationX: 68,
          rotationY: -48,
          scale: 0.46,
        }, {
          autoAlpha: 1,
          z: 0,
          rotationX: 8,
          rotationY: -10,
          scale: 1,
          duration: 1.1,
          ease: "expo.out",
        }, 0.08)
        .fromTo(".hero-book-shadow", {
          autoAlpha: 0,
          scaleX: 0.35,
          scaleY: 0.55,
        }, {
          autoAlpha: 0.72,
          scaleX: 1,
          scaleY: 1,
          duration: 1.1,
        }, 0.12)
        .to(".hero-book-cover", {
          rotationY: -146,
          duration: 0.95,
          ease: "power3.inOut",
        }, 0.72)
        .to(".hero-book-leaf--one", {
          rotationY: -128,
          duration: 0.82,
          ease: "power2.inOut",
        }, 0.84)
        .to(".hero-book-leaf--two", {
          rotationY: -112,
          duration: 0.76,
          ease: "power2.inOut",
        }, 0.94)
        .to(".hero-book-leaf--three", {
          rotationY: -96,
          duration: 0.7,
          ease: "power2.inOut",
        }, 1.02)
        .fromTo(".portal-copy .eyebrow", {
          clipPath: "inset(0 100% 0 0)",
        }, {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.48,
        }, 1.04)
        .fromTo(".hero-title-line", {
          clipPath: "inset(0 0 100% 0)",
          yPercent: 36,
          rotationX: -18,
        }, {
          clipPath: "inset(0 0 0% 0)",
          yPercent: 0,
          rotationX: 0,
          duration: 0.72,
          stagger: 0.12,
          ease: "expo.out",
        }, 1.12)
        .fromTo(".hero-description", {
          clipPath: "inset(0 0 100% 0)",
          filter: "blur(8px)",
        }, {
          clipPath: "inset(0 0 0% 0)",
          filter: "blur(0px)",
          duration: 0.58,
        }, 1.42)
        .to(fragments, {
          autoAlpha: 0.72,
          duration: 0.18,
          stagger: 0.035,
        }, 1.54)
        .to(fragments, {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 0.12,
          autoAlpha: 0,
          duration: 0.72,
          stagger: 0.035,
          ease: "power4.in",
        }, 1.68)
        .fromTo(".portal-copy .search-panel", {
          clipPath: "inset(46% 48% 46% 48% round 40px)",
          filter: "blur(14px)",
          scale: 0.82,
        }, {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          filter: "blur(0px)",
          scale: 1,
          duration: 0.82,
          ease: "expo.out",
        }, 1.86)
        .fromTo(".task-shortcuts", {
          clipPath: "inset(0 100% 0 0)",
        }, {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.5,
        }, 2.16)
        .fromTo(".hero-scroll-cue", {
          scaleY: 0,
          transformOrigin: "top center",
        }, {
          scaleY: 1,
          duration: 0.55,
        }, 2.18);

      if (!conditions.desktop) {
        intro.to(".hero-book-rig", {
          xPercent: 58,
          z: -180,
          scale: 0.76,
          autoAlpha: 0,
          duration: 0.48,
          ease: "power3.inOut",
        }, 1.92);

        gsap.timeline({
          scrollTrigger: {
            id: "shelfmark-mobile-stage-one",
            trigger: ".story-scene--one",
            start: "top 76%",
            end: "bottom 28%",
            scrub: 0.45,
          },
        })
          .fromTo(".story-stage-one", {
            clipPath: "inset(0 0 100% 0)",
          }, {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.34,
            ease: "none",
          })
          .fromTo(".story-spine", {
            y: 150,
            z: -420,
            rotationX: 18,
            rotationY: (index) => index % 2 ? 18 : -18,
          }, {
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            stagger: 0.035,
            duration: 0.66,
            ease: "none",
          }, 0.18);

        const categoryTrack = rootRef.current?.querySelector<HTMLElement>(".story-categories");
        if (categoryTrack) {
          gsap.fromTo(categoryTrack, {
            x: 0,
          }, {
            x: () => -Math.max(0, categoryTrack.scrollWidth - window.innerWidth + 40),
            ease: "none",
            scrollTrigger: {
              id: "shelfmark-mobile-stage-two-track",
              trigger: ".story-scene--two",
              start: "36% 68%",
              end: "bottom 18%",
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });
        }

        gsap.timeline({
          scrollTrigger: {
            id: "shelfmark-mobile-stage-two",
            trigger: ".story-scene--two",
            start: "top 76%",
            end: "55% 38%",
            scrub: 0.45,
          },
        })
          .fromTo(".story-stage-two", {
            clipPath: "inset(0 0 100% 0)",
          }, {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.38,
            ease: "none",
          })
          .fromTo(".category-volume", {
            y: 90,
            rotationY: -18,
            autoAlpha: 0.2,
          }, {
            y: 0,
            rotationY: 0,
            autoAlpha: 1,
            stagger: 0.06,
            duration: 0.62,
            ease: "none",
          }, 0.2);

        gsap.timeline({
          scrollTrigger: {
            id: "shelfmark-mobile-stage-three",
            trigger: ".story-scene--three",
            start: "top 78%",
            end: "45% 38%",
            scrub: 0.45,
          },
        })
          .fromTo(".story-stage-three", {
            clipPath: "inset(0 0 100% 0)",
          }, {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.36,
            ease: "none",
          })
          .fromTo(".story-selected-book", {
            y: 120,
            z: -500,
            rotationY: -34,
            scale: 0.62,
            autoAlpha: 0,
          }, {
            y: 0,
            z: 0,
            rotationY: -8,
            scale: 1,
            autoAlpha: 1,
            duration: 0.64,
            ease: "none",
          }, 0.2);

        gsap.timeline({
          scrollTrigger: {
            id: "shelfmark-mobile-book-handoff",
            trigger: ".story-selection",
            start: "top 94%",
            end: "top 48%",
            scrub: 0.45,
          },
        })
          .to(".story-selected-book img", {
            y: 110,
            scale: 0.58,
            autoAlpha: 0,
            duration: 0.42,
            ease: "none",
          }, 0)
          .fromTo(".story-selection", {
            clipPath: "inset(0 0 18% 0)",
            y: 72,
            autoAlpha: 0,
          }, {
            clipPath: "inset(0 0 0% 0)",
            y: 0,
            autoAlpha: 1,
            duration: 0.58,
            ease: "none",
          }, 0.42);
      }

      if (conditions.desktop) {
        gsap.set([".story-stage-two", ".story-stage-three", ".story-selection", ".category-volume"], { autoAlpha: 0 });

        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            id: "shelfmark-story",
            trigger: ".discovery-story",
            pin: ".story-pin",
            start: "top top",
            end: "+=300%",
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
          .fromTo(".story-bg", {
            scale: 1.2,
            filter: "blur(16px) brightness(.34)",
          }, {
            scale: 1.03,
            filter: "blur(0px) brightness(.56)",
            duration: 0.28,
          }, 0)
          .fromTo(".shelf-plane", {
            z: -1000,
            rotationX: 78,
            scale: 0.64,
          }, {
            z: 0,
            rotationX: 62,
            scale: 1,
            duration: 0.3,
          }, 0)
          .fromTo(".story-spine", {
            z: -1000,
            y: 180,
            rotationY: (index) => index % 2 ? 26 : -26,
          }, {
            z: (index) => -80 + index * 18,
            y: 0,
            rotationY: 0,
            stagger: 0.018,
            duration: 0.24,
          }, 0.02)
          .fromTo(".story-stage-one", {
            clipPath: "inset(0 100% 0 0)",
          }, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.16,
          }, 0.04)
          .to(".story-stage-one", {
            clipPath: "inset(0 0 100% 0)",
            autoAlpha: 0,
            duration: 0.1,
          }, 0.3)
          .to(".story-shelf-space", {
            z: 420,
            scale: 1.34,
            filter: "blur(9px)",
            autoAlpha: 0.28,
            duration: 0.18,
          }, 0.28)
          .fromTo(".story-stage-two", {
            autoAlpha: 0,
            clipPath: "inset(0 0 100% 0)",
          }, {
            autoAlpha: 1,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.14,
          }, 0.34)
          .fromTo(".category-volume", {
            autoAlpha: 0,
            xPercent: (index) => 180 + index * 34,
            z: (index) => -420 + index * 70,
            rotationY: -42,
          }, {
            autoAlpha: 1,
            xPercent: (index) => -82 + index * 42,
            z: (index) => -80 + index * 26,
            rotationY: -8,
            stagger: 0.02,
            duration: 0.27,
          }, 0.33)
          .to(".category-volume", {
            xPercent: (index) => -260 - index * 25,
            z: 240,
            rotationY: 22,
            autoAlpha: 0,
            stagger: 0.012,
            duration: 0.18,
          }, 0.6)
          .to(".story-stage-two", {
            clipPath: "inset(0 100% 0 0)",
            autoAlpha: 0,
            duration: 0.12,
          }, 0.62)
          .fromTo(".story-selected-book", {
            autoAlpha: 0,
            z: -900,
            rotationX: 34,
            rotationY: -48,
            scale: 0.46,
          }, {
            autoAlpha: 1,
            z: 80,
            rotationX: 0,
            rotationY: -8,
            scale: 1,
            duration: 0.22,
          }, 0.65)
          .to(".story-selected-book", {
            xPercent: -126,
            rotationY: 8,
            scale: 0.72,
            duration: 0.16,
          }, 0.76)
          .fromTo(".story-stage-three", {
            autoAlpha: 0,
            clipPath: "inset(0 0 100% 0)",
          }, {
            autoAlpha: 1,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.14,
          }, 0.7)
          .fromTo(".story-selection", {
            autoAlpha: 0,
            clipPath: "inset(0 100% 0 0)",
            rotationY: 12,
            z: -160,
          }, {
            autoAlpha: 1,
            clipPath: "inset(0 0% 0 0)",
            rotationY: 0,
            z: 0,
            duration: 0.22,
          }, 0.75)
          .to(".story-selected-book", {
            autoAlpha: 0,
            scale: 0.56,
            duration: 0.12,
          }, 0.84)
          .fromTo(".story-progress-fill", {
            scaleY: 0,
            transformOrigin: "top center",
          }, {
            scaleY: 1,
            duration: 1,
          }, 0);
      }

      if (conditions.finePointer) {
        const button = rootRef.current?.querySelector<HTMLElement>(".portal-copy .find-button");
        if (!button) return;

        const moveX = gsap.quickTo(button, "x", { duration: 0.34, ease: "power3.out" });
        const moveY = gsap.quickTo(button, "y", { duration: 0.34, ease: "power3.out" });
        const handleMove = (event: PointerEvent) => {
          const bounds = button.getBoundingClientRect();
          moveX((event.clientX - bounds.left - bounds.width / 2) * 0.14);
          moveY((event.clientY - bounds.top - bounds.height / 2) * 0.18);
        };
        const handleLeave = () => {
          moveX(0);
          moveY(0);
        };

        button.addEventListener("pointermove", handleMove);
        button.addEventListener("pointerleave", handleLeave);
        return () => {
          button.removeEventListener("pointermove", handleMove);
          button.removeEventListener("pointerleave", handleLeave);
        };
      }
    });

    window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => media.revert();
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className="cinematic-home">
      <section className="portal-hero cinematic-hero" aria-labelledby="hero-title">
        <div className="portal-stage">
          <Image className="portal-art" src="/media/reading-portal.webp" alt="" fill priority sizes="100vw" />
          <div className="portal-vignette" aria-hidden="true" />

          <div className="hero-book-world" aria-hidden="true">
              <div className="hero-book-rig">
                <div className="hero-book-shadow" />
                <div className="hero-book-back">
                  <div className="hero-page-content">
                    <span>Selected passage / 01</span>
                    <strong>Every book begins with a search.</strong>
                    <small>Title, author, ISBN. One field opens the collection.</small>
                  </div>
                </div>
              <div className="hero-book-leaf hero-book-leaf--three" />
              <div className="hero-book-leaf hero-book-leaf--two" />
              <div className="hero-book-leaf hero-book-leaf--one" />
              <div className="hero-book-cover">
                <Image src="/media/the-martian-cover.webp" alt="" fill sizes="260px" />
              </div>
            </div>
          </div>

          <div className="search-convergence" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => <span className="search-fragment" key={index} />)}
          </div>

          <div className="portal-copy">{heroContent}</div>
          <p className="portal-caption"><span>Search the index</span><span>Scroll to explore</span></p>
          <div className="hero-scroll-cue" aria-hidden="true"><span /></div>
        </div>
      </section>

      <section className="discovery-story" aria-label="How Shelfmark turns a search into a book">
        <div className="story-pin">
          <Image className="story-bg" src="/media/reading-portal.webp" alt="" fill sizes="100vw" />
          <div className="story-shade" aria-hidden="true" />

          <div className="story-scene story-scene--one">
            <div className="story-stage story-stage-one">
              <span>Stage 01 / Space</span>
              <h2>The shelf opens.</h2>
              <p>Millions of editions resolve into one searchable space.</p>
            </div>
            <div className="story-shelf-space" aria-hidden="true">
              <div className="shelf-plane" />
              <div className="story-spines">
                {SHELF_SPINES.map((name, index) => (
                  <span className="story-spine" key={name} style={{ "--spine-offset": `${index * 10.8}vw` } as CSSProperties}>{name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="story-scene story-scene--two">
            <div className="story-stage story-stage-two">
              <span>Stage 02 / Explore</span>
              <h2>Move through ideas.</h2>
              <p>Browse by subject, then narrow the field without losing context.</p>
            </div>

            <div className="story-categories" aria-hidden="true">
              {CATEGORIES.map((category) => (
                <article className="category-volume" key={category.name}>
                  <span>{category.index}</span>
                  <strong>{category.name}</strong>
                  <small>{category.detail}</small>
                </article>
              ))}
            </div>
          </div>

          <div className="story-scene story-scene--three">
            <div className="story-stage story-stage-three">
              <span>Stage 03 / Choose</span>
              <h2>One book.<br />Every way in.</h2>
              <p>Confirm the edition, then continue to preview, borrow, or download.</p>
            </div>

            <div className="story-selected-book" aria-hidden="true">
              <Image src="/media/the-martian-cover.webp" alt="" fill sizes="230px" />
            </div>

            <div className="story-selection">{preview}</div>
          </div>

          <div className="story-progress" aria-hidden="true">
            <span className="story-progress-fill" />
            <i>01</i><i>02</i><i>03</i>
          </div>
        </div>
      </section>
    </div>
  );
}
