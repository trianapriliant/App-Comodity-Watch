#!/usr/bin/env python3

from feedback_collection_template import FeedbackTemplateGenerator

def main():
    print("🔄 Generating user testing feedback collection templates...")
    
    generator = FeedbackTemplateGenerator()
    
    # Create Excel template
    excel_file = generator.create_feedback_template()
    
    # Create Google Form questions
    form_file = generator.create_google_form_questions()
    
    print("\\n✅ Template generation completed!")
    print(f"📊 Excel Template: {excel_file}")
    print(f"📝 Google Form Questions: {form_file}")

if __name__ == "__main__":
    main()
