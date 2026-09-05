/**
 * Vision2Real – Products We've Built (Engineering Showcase)
 * Showcases the engineering capability behind Vision2Real.
 */

import { motion } from 'motion/react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { fadeInUp, staggerContainer, transitions } from '@/utils/motion';
import './products-we-built.css';

import eduGuardianImg from '@/assets/images/edu-guardian.png';
import mandiGradeImg from '@/assets/images/mandi-grade-ai.png';
import guRizzImg from '@/assets/images/gu-rizz.png';
import deshDiscoverImg from '@/assets/images/desh-discover.png';
import amplifyImg from '@/assets/images/amplify.png';

interface Project {
  id: string;
  image: string;
  category: string;
  title: string;
  description: string;
  highlights: string[];
  techStack: string[];
}

const PROJECTS: Project[] = [
  {
    id: 'edu-guardian',
    image: eduGuardianImg,
    category: 'AI Multi-Agent Learning Platform',
    title: 'Edu Guardian',
    description:
      'An intelligent multi-agent educational platform built using LangGraph that delivers adaptive learning through Theory → Quiz → Assessment workflows powered by advanced AI reasoning.',
    highlights: ['Multi-Agent AI', 'LangGraph', 'RAG', 'Adaptive Learning'],
    techStack: ['LangGraph', 'Gemini', 'Python', 'Streamlit'],
  },
  {
    id: 'mandi-grade-ai',
    image: mandiGradeImg,
    category: 'AI Crop Quality Assessment Platform',
    title: 'Mandi Grade AI',
    description:
      'An AI-powered computer vision platform that automates crop quality grading and helps improve agricultural decision-making using advanced image understanding.',
    highlights: ['Computer Vision', 'Gemini Vision', 'AI Grading', 'Google Cloud'],
    techStack: ['Python', 'FastAPI', 'Gemini Vision', 'Google Cloud'],
  },
  {
    id: 'gu-rizz',
    image: guRizzImg,
    category: 'Real-Time Social Networking Platform',
    title: 'GU-Rizz',
    description:
      'A scalable real-time social networking platform featuring modern cloud architecture, instant messaging, authentication, and responsive user experiences.',
    highlights: ['Real-Time Messaging', 'Socket.io', 'Authentication', 'Cloud Architecture'],
    techStack: ['Next.js', 'React', 'Node.js', 'MongoDB'],
  },
  {
    id: 'desh-discover',
    image: deshDiscoverImg,
    category: 'Immersive Regional Travel Platform',
    title: 'Desh Discover',
    description:
      'A premium travel discovery experience celebrating India\'s regional culture through immersive storytelling and beautifully crafted modern interfaces.',
    highlights: ['Premium UI/UX', 'Responsive Design', 'Interactive Experience', 'Cultural Discovery'],
    techStack: ['React', 'Tailwind CSS'],
  },
  {
    id: 'amplify',
    image: amplifyImg,
    category: 'AI-Powered NGO Engagement Platform',
    title: 'Amplify',
    description:
      'A modern SaaS platform helping NGOs improve donor engagement using AI-assisted workflows, secure authentication, and real-time cloud synchronization.',
    highlights: ['AI Assistance', 'Firebase Sync', 'Gamification', 'Secure Authentication'],
    techStack: ['Next.js', 'TypeScript', 'Firebase'],
  },
];

export function ProductsWeBuilt() {
  return (
    <Section id="products-we-built" className="v2r-products-showcase">
      <Container>
        <SectionHeading
          eyebrow="ENGINEERING SHOWCASE"
          title="Products We've Built"
          subtitle="Before building Vision2Real, we engineered products across AI, Multi-Agent Systems, Computer Vision, Real-Time Platforms and SaaS. These products demonstrate the engineering quality and product thinking that now power Vision2Real."
        />

        <motion.div
          className="v2r-pwb-list"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {PROJECTS.map((project, index) => {
            const isEven = index % 2 === 1; // Alternating left/right: 0=Image left, 1=Content left (Image right)
            return (
              <motion.div
                key={project.id}
                className={`v2r-pwb-item ${isEven ? 'v2r-pwb-item--reverse' : ''}`}
                variants={fadeInUp}
                transition={transitions.smooth}
              >
                <div className="v2r-pwb-image-wrapper">
                  <img
                    src={project.image}
                    alt={`${project.title} screenshot`}
                    className="v2r-pwb-image"
                    loading="lazy"
                  />
                  <div className="v2r-pwb-image-overlay" />
                </div>

                <div className="v2r-pwb-content">
                  <span className="v2r-pwb-category">{project.category}</span>
                  <h3 className="v2r-pwb-title">{project.title}</h3>
                  <p className="v2r-pwb-description">{project.description}</p>

                  <div className="v2r-pwb-highlights">
                    {project.highlights.slice(0, 4).map((highlight) => (
                      <span key={highlight} className="v2r-pwb-badge">
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="v2r-pwb-tech-stack">
                    {project.techStack.map((tech) => (
                      <span key={tech} className="v2r-pwb-tech-pill">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
